import asyncio
import logging
import os
from pathlib import Path

# local dev: pick up backend/.env before provider modules read their keys (Cloud Run sets real env vars)
_env = Path(__file__).parent / ".env"
if _env.exists():
    for line in _env.read_text().splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

import budget  # noqa: E402
import currency  # noqa: E402
import gemini  # noqa: E402
import liteapi  # noqa: E402
import samples  # noqa: E402
import travelpayouts  # noqa: E402
from models import PlanRequest, SuggestRequest  # noqa: E402

app = FastAPI(title="Google Trip API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])  # Expo web preview
_cache: dict[str, dict] = {}  # ponytail: in-process cache; Redis/Memorystore if >1 instance


def _live(key: str) -> bool:
    return bool(os.environ.get(key))


def providers():
    """Real module when its key is configured, sample data otherwise."""
    return {
        "ai": gemini if _live("GEMINI_API_KEY") else samples,
        "flights": travelpayouts if _live("TRAVELPAYOUTS_TOKEN") else samples,
        "stays": liteapi if _live("LITEAPI_KEY") else samples,
    }


def _err(r):
    return (str(r) or type(r).__name__) if isinstance(r, Exception) else None


@app.get("/health")
def health():
    return {"ok": True, "live": {k: v is not samples for k, v in providers().items()}}


# /places and /countries use keyless Travelpayouts endpoints, so they are always live
@app.get("/places")
async def places(term: str):
    return await travelpayouts.search_places(term) if len(term) >= 2 else []


@app.get("/countries")
async def countries():
    return await travelpayouts.list_countries()


@app.post("/suggest")
async def suggest(req: SuggestRequest):
    key = "suggest" + req.model_dump_json()
    if key in _cache:
        return _cache[key]
    pv = providers()
    sample = [name for name in ("ai", "flights") if pv[name] is samples]

    p, t = req.profile, req.trip
    rates = await currency.usd_rates()
    budget_usd = t.budget / rates.get(p.homeCity.currency, 1.0)
    cands = await pv["flights"].cheapest_destinations(p.homeCity.iata, str(t.departDate), str(t.returnDate))
    cands = [c for c in cands if c["priceUsd"] * t.travelers <= budget_usd][:30]
    cities = await asyncio.gather(*(travelpayouts.city_by_iata(c["iata"]) for c in cands))
    enriched = [
        {**c, "city": ci["name"], "countryCode": ci["countryCode"], "countryName": ci["countryName"], "currency": ci["currency"]}
        for c, ci in zip(cands, cities) if ci
    ]
    if not enriched:
        return {"suggestions": [], "sample": sample}

    ranked = await pv["ai"].rank_suggestions(enriched, p.model_dump(), t.model_dump(mode="json"))
    by_iata = {c["iata"]: c for c in enriched}
    out = []
    for r in ranked:
        c = by_iata.get(r["iata"])
        if c:
            out.append({
                "countryCode": c["countryCode"], "countryName": c["countryName"], "city": c["city"],
                "iata": c["iata"], "localCurrency": c["currency"], "reason": r["reason"],
                "flightPrice": currency.to_money(c["priceUsd"] * t.travelers, rates, p.homeCity.currency, c["currency"]),
            })
    result = {"suggestions": out[:3], "sample": sample}
    if out:
        _cache[key] = result
    return result


@app.post("/plan")
async def plan(req: PlanRequest):
    key = "plan" + req.model_dump_json()
    if key in _cache:
        return _cache[key]
    pv = providers()

    p, t = req.profile, req.trip
    country = next((c for c in await travelpayouts.list_countries() if c["code"] == req.countryCode.upper()), None)
    if not country:
        raise HTTPException(400, "unknown country")

    try:
        if req.city:
            dest, reason = await travelpayouts.city_by_iata(req.city.iata), req.city.reason
        else:
            picked = await pv["ai"].pick_city(country["name"], p.model_dump())
            dest, reason = await travelpayouts.city_by_name(picked["city"], country["code"]), picked["reason"]
    except Exception:
        logging.exception("destination lookup failed")
        raise HTTPException(502, "could not pick a city")
    if not dest:
        raise HTTPException(502, "could not resolve city")

    home, local = p.homeCity.currency, country["currency"]
    depart, ret = str(t.departDate), str(t.returnDate)
    days = (t.returnDate - t.departDate).days

    f_res, s_res, pl_res, rates = await asyncio.gather(
        pv["flights"].flights(p.homeCity.iata, dest["iata"], depart, ret),
        pv["stays"].stays(dest["name"], country["code"], depart, ret, t.travelers, p.homeCity.countryCode),
        pv["ai"].places(dest["name"], country["name"], local, p.model_dump()),
        currency.usd_rates(),
        return_exceptions=True,
    )
    if isinstance(rates, Exception):
        raise HTTPException(502, "currency rates unavailable")
    errors = {"flights": _err(f_res), "stays": _err(s_res), "places": _err(pl_res)}
    for name, r in (("flights", f_res), ("stays", s_res), ("places", pl_res)):
        if isinstance(r, Exception):
            logging.error("%s failed: %r", name, r)

    flights = [] if errors["flights"] else f_res
    stays = [] if errors["stays"] else s_res
    found = pl_res if not errors["places"] else {"activities": [], "food": [], "dailySpendLocalPerPerson": 0, "sources": []}

    daily_usd = found["dailySpendLocalPerPerson"] / rates.get(local, 1.0)
    budget_usd = t.budget / rates.get(home, 1.0)
    b = budget.apply_budget(budget_usd, daily_usd, days, t.travelers, flights, stays)

    def m(usd):
        return currency.to_money(usd, rates, home, local)

    result = {
        "destination": {"city": dest["name"], "iata": dest["iata"], "countryCode": country["code"],
                        "countryName": country["name"], "reason": reason},
        "currencies": {"home": home, "local": local},
        "budget": {
            "total": m(budget_usd), "flightAndStay": m(b["flightAndStayUsd"]),
            "dailySpendPerPerson": m(daily_usd), "days": days,
            "dailySpendTotal": m(b["dailyTotalUsd"]), "remaining": m(b["remainingUsd"]), "fits": b["fits"],
        },
        "flights": [
            {"airline": f["airline"], "departAt": f["departAt"], "returnAt": f["returnAt"], "transfers": f["transfers"],
             "price": m(f["priceUsd"] * t.travelers), "url": f["url"], "seenAt": f["seenAt"], "overBudget": f["overBudget"]}
            for f in b["flights"]
        ],
        "stays": [
            {"name": s["name"], "stars": s["stars"], "price": m(s["priceUsd"]),
             "commission": m(s["commissionUsd"]), "overBudget": s["overBudget"]}
            for s in b["stays"]
        ],
        "activities": found["activities"],
        "food": found["food"],
        "sources": found["sources"],
        "errors": errors,
        "sample": [cat for cat, prov in (("flights", "flights"), ("stays", "stays"), ("places", "ai")) if pv[prov] is samples],
    }
    if not any(errors.values()):
        _cache[key] = result
    return result
