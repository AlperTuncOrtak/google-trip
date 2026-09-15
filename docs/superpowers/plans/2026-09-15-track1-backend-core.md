# Track 1: Backend Çekirdek ve Deploy

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pydantic modelleri, fixture döndüren API, bütçe ve döviz modülleri, gerçek modülleri bağlayan `main.py` ve Cloud Run deploy'u.

**Architecture:** `main.py` başlangıçta `USE_FIXTURES = True` ile sabit JSON döner. Böylece mobil ekip hemen çalışabilir. Track 2 ve 3 modülleri `main.py` içinde fonksiyon içinden (lazy) import edilir, o dosyalar henüz yokken bile uygulama açılır.

**Tech Stack:** Python 3.12+ (local 3.13), FastAPI, pydantic v2, httpx, pytest

**Spec:** `docs/superpowers/specs/2026-09-15-google-trip-design.md`
**Ana plan:** `docs/superpowers/plans/2026-09-15-google-trip.md` (Global Constraints ve sözleşme geçerli)

**Bu track'e özel kural:** Uçuş kartındaki fiyat **tüm yolcular için toplamdır** (`priceUsd × travelers`). Otel fiyatı zaten tüm konaklamanın toplamıdır.

---

### Task 1: İskelet, modeller, fixture API (T0 – 0:20, önce bitir ve push et)

**Files:**
- Create: `backend/requirements.txt`, `backend/models.py`, `backend/main.py`
- Create: `backend/fixtures/places.json`, `countries.json`, `suggest_request.json`, `suggest_response.json`, `plan_request.json`, `plan_response.json`
- Test: `backend/test_api.py`

**Interfaces:**
- Produces: `models.Profile`, `models.Trip`, `models.SuggestRequest`, `models.PlanRequest`, `models.CityRef(name, iata, reason="")`. HTTP endpoint'leri `/health`, `/places`, `/countries`, `/suggest`, `/plan` (fixture modunda).

- [ ] **Step 1: Ortamı kur**

```bash
mkdir -p backend/fixtures && cd backend
python3 -m venv .venv && source .venv/bin/activate
cat > requirements.txt <<'EOF'
fastapi
uvicorn[standard]
httpx
pydantic>=2
google-genai>=2.3.0
pytest
EOF
pip install -r requirements.txt
printf '.venv/\n__pycache__/\n' >> ../.gitignore
```

- [ ] **Step 2: `backend/models.py`**

```python
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, model_validator

Diet = Literal["none", "vegetarian", "vegan", "halal", "gluten_free"]


class City(BaseModel):
    name: str
    iata: str
    countryCode: str
    countryName: str = ""
    currency: str


class Profile(BaseModel):
    homeCity: City
    activities: list[str] = []
    activitiesNote: str = ""
    diet: Diet = "none"

    @model_validator(mode="after")
    def need_activity(self):
        if not self.activities and not self.activitiesNote.strip():
            raise ValueError("pick at least one activity")
        return self


class Trip(BaseModel):
    budget: float = Field(gt=0)  # home currency
    departDate: date
    returnDate: date
    travelers: int = Field(ge=1, le=9)

    @model_validator(mode="after")
    def dates_in_order(self):
        if self.returnDate <= self.departDate:
            raise ValueError("returnDate must be after departDate")
        return self


class SuggestRequest(BaseModel):
    profile: Profile
    trip: Trip


class CityRef(BaseModel):
    name: str
    iata: str
    reason: str = ""


class PlanRequest(BaseModel):
    profile: Profile
    trip: Trip
    countryCode: str = Field(min_length=2, max_length=2)
    city: CityRef | None = None
```

- [ ] **Step 3: Fixture'lar**

`backend/fixtures/places.json`
```json
[{"name": "Warsaw", "iata": "WAW", "countryCode": "PL", "countryName": "Poland", "currency": "PLN"}]
```

`backend/fixtures/countries.json`
```json
[{"code": "JP", "name": "Japan", "currency": "JPY"},
 {"code": "ES", "name": "Spain", "currency": "EUR"},
 {"code": "TR", "name": "Turkey", "currency": "TRY"}]
```

`backend/fixtures/suggest_request.json`
```json
{"profile": {"homeCity": {"name": "Warsaw", "iata": "WAW", "countryCode": "PL", "countryName": "Poland", "currency": "PLN"},
             "activities": ["Street Food", "Museums & History"], "activitiesNote": "", "diet": "halal"},
 "trip": {"budget": 9000, "departDate": "2026-10-10", "returnDate": "2026-10-15", "travelers": 1}}
```

`backend/fixtures/plan_request.json`
```json
{"profile": {"homeCity": {"name": "Warsaw", "iata": "WAW", "countryCode": "PL", "countryName": "Poland", "currency": "PLN"},
             "activities": ["Street Food", "Museums & History"], "activitiesNote": "", "diet": "halal"},
 "trip": {"budget": 9000, "departDate": "2026-10-10", "returnDate": "2026-10-15", "travelers": 1},
 "countryCode": "JP"}
```

`backend/fixtures/suggest_response.json`
```json
{"suggestions": [
  {"countryCode": "JP", "countryName": "Japan", "city": "Osaka", "iata": "OSA", "localCurrency": "JPY",
   "reason": "Street food capital with great history museums.", "flightPrice": {"home": 3400, "local": 124000}},
  {"countryCode": "ES", "countryName": "Spain", "city": "Barcelona", "iata": "BCN", "localCurrency": "EUR",
   "reason": "Tapas everywhere and world-class museums.", "flightPrice": {"home": 620, "local": 145}},
  {"countryCode": "TR", "countryName": "Turkey", "city": "Istanbul", "iata": "IST", "localCurrency": "TRY",
   "reason": "Halal street food and 2,000 years of history.", "flightPrice": {"home": 780, "local": 8100}}
]}
```

`backend/fixtures/plan_response.json`
```json
{
  "destination": {"city": "Osaka", "iata": "OSA", "countryCode": "JP", "countryName": "Japan",
                  "reason": "Street food capital with great history museums."},
  "currencies": {"home": "PLN", "local": "JPY"},
  "budget": {"total": {"home": 9000, "local": 328000}, "flightAndStay": {"home": 5600, "local": 204000},
             "dailySpendPerPerson": {"home": 330, "local": 12000}, "days": 5,
             "dailySpendTotal": {"home": 1650, "local": 60000}, "remaining": {"home": 1750, "local": 64000},
             "fits": true},
  "flights": [
    {"airline": "LO", "departAt": "2026-10-10T13:05:00+02:00", "returnAt": "2026-10-15T10:40:00+09:00", "transfers": 1,
     "price": {"home": 3400, "local": 124000}, "url": "https://www.aviasales.com/", "seenAt": "2026-09-15T08:00:00Z", "overBudget": false},
    {"airline": "AY", "departAt": "2026-10-10T07:15:00+02:00", "returnAt": "2026-10-15T11:55:00+09:00", "transfers": 1,
     "price": {"home": 3900, "local": 142000}, "url": "https://www.aviasales.com/", "seenAt": "2026-09-15T08:00:00Z", "overBudget": false},
    {"airline": "LH", "departAt": "2026-10-10T06:00:00+02:00", "returnAt": "2026-10-15T09:30:00+09:00", "transfers": 1,
     "price": {"home": 7600, "local": 277000}, "url": "https://www.aviasales.com/", "seenAt": "2026-09-15T08:00:00Z", "overBudget": true}
  ],
  "stays": [
    {"name": "Hotel Kansai Namba", "stars": 3, "price": {"home": 2200, "local": 80000}, "commission": {"home": 105, "local": 3800}, "overBudget": false},
    {"name": "Dotonbori Riverside Inn", "stars": 4, "price": {"home": 3100, "local": 113000}, "commission": {"home": 148, "local": 5400}, "overBudget": false},
    {"name": "Grand Osaka Tower", "stars": 5, "price": {"home": 6800, "local": 248000}, "commission": {"home": 324, "local": 11800}, "overBudget": true}
  ],
  "activities": [
    {"name": "Osaka Castle", "description": "Iconic castle with a history museum inside."},
    {"name": "Kuromon Market", "description": "Covered market famous for street food stalls."}
  ],
  "food": [
    {"name": "Matsuri Halal Ramen", "description": "Halal-certified ramen near Namba."},
    {"name": "Naritaya Asakusa", "description": "Halal ramen shop popular with travelers."}
  ],
  "sources": [{"title": "Osaka Castle", "uri": "https://maps.google.com/?cid=1"}],
  "errors": {"flights": null, "stays": null, "places": null}
}
```

- [ ] **Step 4: Testi yaz — `backend/test_api.py`**

```python
import json
from pathlib import Path

from fastapi.testclient import TestClient

import main

client = TestClient(main.app)
FIX = Path(__file__).parent / "fixtures"


def body(name):
    return json.loads((FIX / name).read_text())


def test_health():
    assert client.get("/health").json() == {"ok": True}


def test_plan_fixture_shape():
    r = client.post("/plan", json=body("plan_request.json"))
    assert r.status_code == 200
    assert set(r.json()) >= {"destination", "currencies", "budget", "flights", "stays",
                             "activities", "food", "sources", "errors"}


def test_rejects_return_before_depart():
    b = body("plan_request.json")
    b["trip"]["returnDate"] = "2026-10-01"
    assert client.post("/plan", json=b).status_code == 422


def test_rejects_empty_activities():
    b = body("suggest_request.json")
    b["profile"]["activities"] = []
    assert client.post("/suggest", json=b).status_code == 422
```

- [ ] **Step 5: Çalıştır ve fail ettiğini gör**

Run: `cd backend && pytest test_api.py -q`
Expected: FAIL, `ModuleNotFoundError: No module named 'main'`

- [ ] **Step 6: `backend/main.py` (fixture modu)**

```python
import json
from pathlib import Path

from fastapi import FastAPI

from models import PlanRequest, SuggestRequest

USE_FIXTURES = True
FIX = Path(__file__).parent / "fixtures"
app = FastAPI(title="Google Trip API")


def fixture(name: str):
    return json.loads((FIX / name).read_text())


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/places")
async def places(term: str):
    return fixture("places.json")


@app.get("/countries")
async def countries():
    return fixture("countries.json")


@app.post("/suggest")
async def suggest(req: SuggestRequest):
    return fixture("suggest_response.json")


@app.post("/plan")
async def plan(req: PlanRequest):
    return fixture("plan_response.json")
```

- [ ] **Step 7: Testleri geçir**

Run: `pytest test_api.py -q`
Expected: `4 passed`

- [ ] **Step 8: Mobil ekip için local'de aç**

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

Laptop'un yerel IP'sini (`ipconfig getifaddr en0`) Kişi 4 ve 5'e ver: `http://<IP>:8000`.

- [ ] **Step 9: Commit ve push**

```bash
git add . ../.gitignore && git commit -m "feat(backend): models, fixture API" && git pull --rebase && git push
```

---

### Task 2: Bütçe kuralları (`budget.py`)

**Files:**
- Create: `backend/budget.py`
- Test: `backend/test_budget.py`

**Interfaces:**
- Consumes: Track 2'nin çıktıları. `flights: [{..., priceUsd}]` (kişi başı), `stays: [{..., priceUsd}]` (toplam)
- Produces: `apply_budget(budget_usd: float, daily_usd_per_person: float, days: int, travelers: int, flights: list[dict], stays: list[dict]) -> dict`. Dönen dict: `{flights[<=5], stays[<=5], dailyTotalUsd, flightAndStayUsd, remainingUsd, fits}`. Her öğeye `overBudget: bool` eklenir.

- [ ] **Step 1: Failing test — `backend/test_budget.py`**

```python
from budget import apply_budget


def f(p):
    return {"priceUsd": p}


def test_daily_spend_and_remaining():
    r = apply_budget(1000, 50, 4, 2, [f(100)], [f(200)])
    assert r["dailyTotalUsd"] == 400                  # 50 * 4 days * 2 people
    assert r["flightAndStayUsd"] == 400               # 100*2 + 200
    assert r["remainingUsd"] == 200
    assert r["fits"] is True


def test_flags_item_exactly_on_limit_as_fitting():
    # remaining before flight/stay = 1000 - 0 = 1000; cheapest stay 400
    r = apply_budget(1000, 0, 1, 1, [f(600), f(601)], [f(400)])
    assert [x["overBudget"] for x in r["flights"]] == [False, True]


def test_sorted_cheapest_first_and_top5():
    r = apply_budget(10_000, 0, 1, 1, [f(p) for p in (9, 3, 7, 1, 5, 2)], [f(1)])
    assert [x["priceUsd"] for x in r["flights"]] == [1, 2, 3, 5, 7]


def test_over_budget_items_sink_to_bottom():
    r = apply_budget(500, 0, 1, 1, [f(100)], [f(450), f(100), f(300)])
    assert [x["overBudget"] for x in r["stays"]] == [False, False, True]


def test_empty_category_counts_as_zero():
    r = apply_budget(300, 0, 1, 1, [], [f(250)])
    assert r["flightAndStayUsd"] == 250
    assert r["stays"][0]["overBudget"] is False
    assert r["fits"] is True


def test_not_fitting_when_cheapest_combo_exceeds():
    r = apply_budget(100, 10, 5, 1, [f(40)], [f(20)])
    assert r["fits"] is False
```

- [ ] **Step 2: Fail ettiğini gör**

Run: `pytest test_budget.py -q`
Expected: FAIL, `ModuleNotFoundError: No module named 'budget'`

- [ ] **Step 3: `backend/budget.py`**

```python
def apply_budget(budget_usd, daily_usd_per_person, days, travelers, flights, stays):
    daily_total = daily_usd_per_person * days * travelers
    remaining = budget_usd - daily_total
    flights = sorted(flights, key=lambda x: x["priceUsd"])
    stays = sorted(stays, key=lambda x: x["priceUsd"])
    min_flight = flights[0]["priceUsd"] * travelers if flights else 0
    min_stay = stays[0]["priceUsd"] if stays else 0

    # fit is monotonic in price, so price-sorted lists already put over-budget items last
    for x in flights:
        x["overBudget"] = x["priceUsd"] * travelers + min_stay > remaining
    for x in stays:
        x["overBudget"] = min_flight + x["priceUsd"] > remaining

    flight_and_stay = min_flight + min_stay
    left = budget_usd - daily_total - flight_and_stay
    return {
        "flights": flights[:5],
        "stays": stays[:5],
        "dailyTotalUsd": daily_total,
        "flightAndStayUsd": flight_and_stay,
        "remainingUsd": left,
        "fits": left >= 0,
    }
```

- [ ] **Step 4: Testleri geçir**

Run: `pytest test_budget.py -q`
Expected: `6 passed`

- [ ] **Step 5: Commit**

```bash
git add budget.py test_budget.py && git commit -m "feat(backend): budget fitting rules" && git pull --rebase && git push
```

---

### Task 3: Döviz (`currency.py`)

**Files:**
- Create: `backend/currency.py`
- Test: `backend/test_currency.py`

**Interfaces:**
- Produces: `async usd_rates() -> dict[str, float]` (1 saat önbellekli), `to_money(usd: float, rates: dict, home: str, local: str) -> {"home": float, "local": float}`

- [ ] **Step 1: Failing test — `backend/test_currency.py`**

```python
from currency import to_money


def test_converts_to_both_currencies():
    rates = {"USD": 1, "PLN": 4.0, "JPY": 150.0}
    assert to_money(10, rates, "PLN", "JPY") == {"home": 40.0, "local": 1500.0}


def test_unknown_currency_falls_back_to_usd():
    assert to_money(10, {"USD": 1}, "XXX", "USD") == {"home": 10.0, "local": 10.0}
```

- [ ] **Step 2: Fail ettiğini gör**

Run: `pytest test_currency.py -q`
Expected: FAIL, `ModuleNotFoundError: No module named 'currency'`

- [ ] **Step 3: `backend/currency.py`**

```python
import logging
import time

import httpx

_cache = {"at": 0.0, "rates": {}}


async def usd_rates() -> dict[str, float]:
    if _cache["rates"] and time.time() - _cache["at"] < 3600:
        return _cache["rates"]
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get("https://open.er-api.com/v6/latest/USD")
        r.raise_for_status()
        _cache.update(at=time.time(), rates=r.json()["rates"])
    return _cache["rates"]


def _rate(rates: dict, code: str) -> float:
    if code not in rates:
        logging.warning("no rate for %s, showing USD", code)
    return rates.get(code, 1.0)


def to_money(usd: float, rates: dict, home: str, local: str) -> dict:
    return {"home": round(usd * _rate(rates, home), 2), "local": round(usd * _rate(rates, local), 2)}
```

- [ ] **Step 4: Testleri geçir ve canlı kurları kontrol et**

Run: `pytest test_currency.py -q`
Expected: `2 passed`

Run: `python -c "import asyncio, currency; r = asyncio.run(currency.usd_rates()); print(r['PLN'], r['JPY'])"`
Expected: iki sayı (örn. `3.6 147.2`)

- [ ] **Step 5: Commit**

```bash
git add currency.py test_currency.py && git commit -m "feat(backend): currency rates and conversion" && git pull --rebase && git push
```

---

### Task 4: Gerçek akışı `main.py`'ye yaz (bayrak kapalı kalacak)

Bu görevde kod yazılır ama `USE_FIXTURES = True` kalır. Bayrak entegrasyonda (ana plan Task I1) kapatılır.

**Files:**
- Modify: `backend/main.py` (dosyanın tamamı değişir)
- Test: `backend/test_api.py` (değişmez, hâlâ geçmeli)

**Interfaces:**
- Consumes: ana plandaki sözleşme. `travelpayouts.search_places`, `list_countries`, `city_by_name`, `city_by_iata`, `flights`, `cheapest_destinations`; `liteapi.stays`; `gemini.pick_city`, `rank_suggestions`, `places`; `currency.usd_rates`, `to_money`; `budget.apply_budget`
- Produces: spec §7.1'deki HTTP yanıtları

- [ ] **Step 1: `backend/main.py` dosyasının tamamını değiştir**

```python
import asyncio
import json
import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException

import budget
import currency
from models import PlanRequest, SuggestRequest

USE_FIXTURES = True
FIX = Path(__file__).parent / "fixtures"
app = FastAPI(title="Google Trip API")
_cache: dict[str, dict] = {}  # ponytail: in-process cache; Redis/Memorystore if >1 instance


def fixture(name: str):
    return json.loads((FIX / name).read_text())


def _err(r):
    return (str(r) or type(r).__name__) if isinstance(r, Exception) else None


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/places")
async def places(term: str):
    if USE_FIXTURES:
        return fixture("places.json")
    import travelpayouts
    return await travelpayouts.search_places(term) if len(term) >= 2 else []


@app.get("/countries")
async def countries():
    if USE_FIXTURES:
        return fixture("countries.json")
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
```

- [ ] **Step 2: Fixture moduyla testlerin hâlâ geçtiğini doğrula**

Run: `pytest -q`
Expected: tüm testler PASS (`test_api`, `test_budget`, `test_currency`)

- [ ] **Step 3: Commit**

```bash
git add main.py && git commit -m "feat(backend): real plan/suggest orchestration behind USE_FIXTURES" && git pull --rebase && git push
```

---

### Task 5: Cloud Run (spike 0:20–0:45 civarı, fixture moduyla deploy)

**Files:**
- Create: `backend/Dockerfile`, `backend/.dockerignore`

- [ ] **Step 1: `backend/Dockerfile`**

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
```

- [ ] **Step 2: `backend/.dockerignore`**

```
.venv
__pycache__
.env
.pytest_cache
```

- [ ] **Step 3: GCP hazırlığı** (proje ve faturalandırmanın hackathon hesabında açık olması gerekir)

```bash
gcloud auth login
gcloud config set project <PROJECT_ID>
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

- [ ] **Step 4: Fixture moduyla ilk deploy**

```bash
gcloud run deploy google-trip-api --source . --region us-central1 --allow-unauthenticated --min-instances 1 --timeout 120
```

Expected: `Service URL: https://google-trip-api-xxxx-uc.a.run.app`

- [ ] **Step 5: Doğrula**

Run: `curl -s https://<SERVICE_URL>/health`
Expected: `{"ok":true}`

URL'yi Kişi 4 ve 5'e ver.

- [ ] **Step 6: Commit**

```bash
git add Dockerfile .dockerignore && git commit -m "chore(backend): Cloud Run container" && git pull --rebase && git push
```
