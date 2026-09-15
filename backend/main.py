import asyncio
import json
import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import budget
import currency
from models import PlanRequest, SuggestRequest

USE_FIXTURES = True
FIX = Path(__file__).parent / "fixtures"
app = FastAPI(title="Google Trip API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])  # Expo web preview
_cache: dict[str, dict] = {}  # ponytail: in-process cache; Redis/Memorystore if >1 instance


def fixture(name: str):
    return json.loads((FIX / name).read_text())


def _err(r):
    return (str(r) or type(r).__name__) if isinstance(r, Exception) else None


@app.get("/health")
def health():
    return {"ok": True}


# /places and /countries use keyless Travelpayouts endpoints, so they are always live
@app.get("/places")
async def places(term: str):
    import travelpayouts
    return await travelpayouts.search_places(term) if len(term) >= 2 else []


@app.get("/countries")
async def countries():
    import travelpayouts
    return await travelpayouts.list_countries()


@app.post("/suggest")
async def suggest(req: SuggestRequest):
    if USE_FIXTURES:
        return fixture("suggest_response.json")
    key = "suggest" + req.model_dump_json()
    if key in _cache:
        return _cache[key]
    import gemini
    import travelpayouts

    p, t = req.profile, req.trip
    rates = await currency.usd_rates()
    budget_usd = t.budget / rates.get(p.homeCity.currency, 1.0)
    cands = await travelpayouts.cheapest_destinations(p.homeCity.iata, str(t.departDate), str(t.returnDate))
    cands = [c for c in cands if c["priceUsd"] * t.travelers <= budget_usd][:30]
    cities = await asyncio.gather(*(travelpayouts.city_by_iata(c["iata"]) for c in cands))
    enriched = [
        {**c, "city": ci["name"], "countryCode": ci["countryCode"], "countryName": ci["countryName"], "currency": ci["currency"]}
        for c, ci in zip(cands, cities) if ci
    ]
    if not enriched:
        return {"suggestions": []}

    ranked = await gemini.rank_suggestions(enriched, p.model_dump(), t.model_dump(mode="json"))
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
    result = {"suggestions": out[:3]}
    if out:
        _cache[key] = result
    return result


@app.post("/plan")
async def plan(req: PlanRequest):
    if USE_FIXTURES:
        return fixture("plan_response.json")
    key = "plan" + req.model_dump_json()
    if key in _cache:
        return _cache[key]
    import gemini
    import liteapi
    import travelpayouts

    p, t = req.profile, req.trip
    country = next((c for c in await travelpayouts.list_countries() if c["code"] == req.countryCode.upper()), None)
    if not country:
        raise HTTPException(400, "unknown country")

    try:
        if req.city:
            dest, reason = await travelpayouts.city_by_iata(req.city.iata), req.city.reason
        else:
            picked = await gemini.pick_city(country["name"], p.model_dump())
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
        travelpayouts.flights(p.homeCity.iata, dest["iata"], depart, ret),
        liteapi.stays(dest["name"], country["code"], depart, ret, t.travelers, p.homeCity.countryCode),
        gemini.places(dest["name"], country["name"], local, p.model_dump()),
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
    }
    if not any(errors.values()):
        _cache[key] = result
    return result
