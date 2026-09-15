# Track 2: Seyahat API'leri (Travelpayouts + LiteAPI)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Şehir arama, ülke listesi, uçuş fiyatları (affiliate linkli), en ucuz destinasyonlar ve otel fiyatları (%5 komisyonlu) veren iki Python modülü.

**Architecture:** Her modül httpx ile ilgili API'yi çağırır. Ham yanıtı saf (pure) bir `parse`/`to_*` fonksiyonuyla sözleşmedeki şekle çevirir. Testler, spike'ta kaydedilen gerçek yanıt örnekleri üzerinden bu saf fonksiyonları kontrol eder.

**Tech Stack:** Python 3.12+ (local 3.13), httpx, pytest

**Spec:** `docs/superpowers/specs/2026-09-15-google-trip-design.md`
**Ana plan:** `docs/superpowers/plans/2026-09-15-google-trip.md` (Global Constraints ve sözleşme geçerli)

**Ön koşul:** Track 1 Task 1 push edilmiş olmalı (`backend/` ve venv). Değilse `backend/` klasöründe `python3 -m venv .venv && source .venv/bin/activate && pip install httpx pytest` yeterli.

---

### Task 1: Spike, anahtarlar ve gerçek yanıt örnekleri (T0 – 0:45)

**Files:**
- Create: `backend/.env` (git'e girmez)
- Create: `backend/fixtures/raw_autocomplete.json`, `raw_prices_route.json`, `raw_prices_open.json`, `raw_liteapi_rates.json`

- [ ] **Step 1: Hesapları aç**
  - Travelpayouts: https://www.travelpayouts.com. Kayıt olunca **Profile → API token** ve **marker** (partner ID) alınır. Aviasales programına katılınır. Program kurallarında **mobil uygulama trafiğinin kabul edilip edilmediği** kontrol edilir ve sonuç ekibe yazılır.
  - LiteAPI: https://dashboard.liteapi.travel. Kayıt olunur, **sandbox API key** kopyalanır.

- [ ] **Step 2: `backend/.env`**

```bash
TRAVELPAYOUTS_TOKEN=...
TRAVELPAYOUTS_MARKER=...
LITEAPI_KEY=...
GEMINI_API_KEY=...
```

Yükle: `cd backend && set -a && source .env && set +a`

- [ ] **Step 3: Travelpayouts örneklerini kaydet**

```bash
curl -s "https://autocomplete.travelpayouts.com/places2?term=warsaw&locale=en&types[]=city" > fixtures/raw_autocomplete.json
curl -s "https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=WAW&destination=TYO&departure_at=2026-10&return_at=2026-10&currency=usd&sorting=price&limit=5&one_way=false&token=$TRAVELPAYOUTS_TOKEN" > fixtures/raw_prices_route.json
curl -s "https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=WAW&departure_at=2026-10&return_at=2026-10&currency=usd&sorting=price&limit=30&one_way=false&unique=true&token=$TRAVELPAYOUTS_TOKEN" > fixtures/raw_prices_open.json
python3 -m json.tool fixtures/raw_prices_route.json | head -30
```

Kontrol listesi:
- `raw_autocomplete.json` bir liste mi? Elemanlarda `code`, `name`, `country_code` alanları var mı?
- `raw_prices_route.json` içinde `data[]` var mı? Elemanlarda `price`, `airline`, `departure_at`, `return_at`, `transfers`, `link` alanları var mı? `found_at` gibi bir tarih alanı var mı?
- `raw_prices_open.json` destination vermeden farklı `destination` değerleri dönüyor mu? **Boş dönüyorsa** şunu dene ve dosyaya bunu kaydet: `https://api.travelpayouts.com/v2/prices/latest?origin=WAW&currency=usd&limit=30&period_type=year&token=$TRAVELPAYOUTS_TOKEN`
- `link` alanının başına `https://www.aviasales.com` eklenip `&marker=<MARKER>` ile tarayıcıda açılınca arama sayfası geliyor mu?

**Alan adları farklıysa** Task 2'deki `to_flight`, `to_destination` ve `to_city` fonksiyonlarındaki anahtar isimleri gerçek yanıta göre düzelt, testlerdeki örnek veriyi de aynı şekilde güncelle.

- [ ] **Step 4: LiteAPI örneğini kaydet**

```bash
curl -s -X POST https://api.liteapi.travel/v3.0/hotels/rates \
  -H "X-API-Key: $LITEAPI_KEY" -H "content-type: application/json" \
  -d '{"cityName":"Osaka","countryCode":"JP","checkin":"2026-10-10","checkout":"2026-10-15","currency":"USD","guestNationality":"PL","occupancies":[{"adults":1}],"margin":5,"limit":5,"maxRatesPerHotel":1}' \
  > fixtures/raw_liteapi_rates.json
python3 -m json.tool fixtures/raw_liteapi_rates.json | head -60
```

Kontrol listesi:
- Fiyat `data[].roomTypes[0].rates[0].retailRate.total[0].amount` yolunda mı?
- Otel adı ve yıldız nerede? Top-level `hotels[]` içinde `id`, `name`, `stars` olarak mı, yoksa `data[]` elemanının içinde mi?
- Rate içinde `commission` alanı var mı?

Farklıysa Task 3'teki `parse_rates` fonksiyonunu ve testteki örneği gerçek yola göre düzelt.

- [ ] **Step 5: Sonucu ekibe yaz ve commit et** (`.env` hariç)

```bash
git add fixtures/raw_*.json && git commit -m "chore(backend): real API response samples" && git pull --rebase && git push
```

---

### Task 2: `travelpayouts.py`

**Files:**
- Create: `backend/travelpayouts.py`
- Test: `backend/test_travelpayouts.py`

**Interfaces:**
- Produces (ana plan sözleşmesi):
  - `async search_places(term) -> [{name, iata, countryCode, countryName, currency}]`
  - `async list_countries() -> [{code, name, currency}]`
  - `async city_by_name(name, country_code) -> dict | None`
  - `async city_by_iata(iata) -> dict | None`
  - `async flights(origin, destination, depart, ret) -> [{airline, departAt, returnAt, transfers, priceUsd, url, seenAt}]`
  - `async cheapest_destinations(origin, depart, ret) -> [{iata, priceUsd}]`
  - saf fonksiyonlar: `affiliate_url(link) -> str`, `to_flight(row) -> dict`, `to_destinations(rows) -> list`

- [ ] **Step 1: Failing test — `backend/test_travelpayouts.py`**

```python
import travelpayouts as tp


def test_affiliate_url_appends_marker(monkeypatch):
    monkeypatch.setattr(tp, "MARKER", "12345")
    assert tp.affiliate_url("/search/WAW1010TYO1510?t=abc") == "https://www.aviasales.com/search/WAW1010TYO1510?t=abc&marker=12345"
    assert tp.affiliate_url("/search/WAW1010TYO1510") == "https://www.aviasales.com/search/WAW1010TYO1510?marker=12345"


def test_to_flight_maps_fields():
    row = {"price": 612, "airline": "LO", "departure_at": "2026-10-10T13:05:00+02:00",
           "return_at": "2026-10-15T10:40:00+09:00", "transfers": 1, "link": "/search/x?t=1",
           "found_at": "2026-09-14T20:00:00Z"}
    f = tp.to_flight(row)
    assert f["priceUsd"] == 612.0
    assert f["airline"] == "LO"
    assert f["transfers"] == 1
    assert f["url"].startswith("https://www.aviasales.com/search/x?t=1")
    assert f["seenAt"] == "2026-09-14T20:00:00Z"


def test_to_destinations_keeps_cheapest_per_city():
    rows = [{"destination": "BCN", "price": 90}, {"destination": "BCN", "price": 70}, {"destination": "IST", "price": 120}]
    assert tp.to_destinations(rows) == [{"iata": "BCN", "priceUsd": 70.0}, {"iata": "IST", "priceUsd": 120.0}]


def test_to_city_uses_country_currency():
    countries = {"PL": {"code": "PL", "name": "Poland", "currency": "PLN"}}
    assert tp.to_city("WAW", "Warsaw", "PL", countries) == {
        "name": "Warsaw", "iata": "WAW", "countryCode": "PL", "countryName": "Poland", "currency": "PLN"}
```

- [ ] **Step 2: Fail ettiğini gör**

Run: `pytest test_travelpayouts.py -q`
Expected: FAIL, `ModuleNotFoundError: No module named 'travelpayouts'`

- [ ] **Step 3: `backend/travelpayouts.py`**

```python
import os

import httpx

TOKEN = os.environ.get("TRAVELPAYOUTS_TOKEN", "")
MARKER = os.environ.get("TRAVELPAYOUTS_MARKER", "")
API = "https://api.travelpayouts.com"
_static: dict[str, list] = {}


async def _get(url: str, params: dict):
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(url, params=params)
        r.raise_for_status()
        return r.json()


async def _data(name: str) -> list:
    if name not in _static:  # countries.json / cities.json rarely change: load once per process
        _static[name] = await _get(f"{API}/data/en/{name}.json", {})
    return _static[name]


def affiliate_url(link: str) -> str:
    sep = "&" if "?" in link else "?"
    return f"https://www.aviasales.com{link}{sep}marker={MARKER}"


def to_flight(row: dict) -> dict:
    return {
        "airline": row.get("airline", ""),
        "departAt": row.get("departure_at", ""),
        "returnAt": row.get("return_at", ""),
        "transfers": row.get("transfers", 0),
        "priceUsd": float(row["price"]),
        "url": affiliate_url(row.get("link", "")),
        "seenAt": row.get("found_at", ""),
    }


def to_destinations(rows: list[dict]) -> list[dict]:
    best: dict[str, float] = {}
    for r in rows:
        iata, price = r["destination"], float(r["price"])
        if iata not in best or price < best[iata]:
            best[iata] = price
    return [{"iata": k, "priceUsd": v} for k, v in sorted(best.items(), key=lambda kv: kv[1])]


def to_city(iata: str, name: str, country_code: str, countries: dict) -> dict:
    c = countries.get(country_code, {})
    return {"name": name, "iata": iata, "countryCode": country_code,
            "countryName": c.get("name", ""), "currency": c.get("currency", "USD")}


async def list_countries() -> list[dict]:
    rows = await _data("countries")
    out = [{"code": c["code"], "name": c["name"], "currency": c["currency"]}
           for c in rows if c.get("name") and c.get("currency")]
    return sorted(out, key=lambda c: c["name"])


async def _countries_by_code() -> dict:
    return {c["code"]: c for c in await list_countries()}


async def search_places(term: str) -> list[dict]:
    rows = await _get("https://autocomplete.travelpayouts.com/places2",
                      {"term": term, "locale": "en", "types[]": "city"})
    countries = await _countries_by_code()
    return [to_city(r["code"], r["name"], r["country_code"], countries) for r in rows[:8]]


async def city_by_name(name: str, country_code: str) -> dict | None:
    return next((c for c in await search_places(name) if c["countryCode"] == country_code), None)


async def city_by_iata(iata: str) -> dict | None:
    countries = await _countries_by_code()
    for c in await _data("cities"):
        if c.get("code") == iata and c.get("name"):
            return to_city(c["code"], c["name"], c["country_code"], countries)
    return None


async def _prices(params: dict) -> list[dict]:
    base = {"currency": "usd", "sorting": "price", "limit": 30, "one_way": "false", "token": TOKEN}
    body = await _get(f"{API}/aviasales/v3/prices_for_dates", base | params)
    return body.get("data", [])


async def flights(origin: str, destination: str, depart: str, ret: str) -> list[dict]:
    route = {"origin": origin, "destination": destination}
    rows = await _prices(route | {"departure_at": depart, "return_at": ret})
    if not rows:  # cached data is sparse for exact days; widen to the month
        rows = await _prices(route | {"departure_at": depart[:7], "return_at": ret[:7]})
    return [to_flight(r) for r in rows]


async def cheapest_destinations(origin: str, depart: str, ret: str) -> list[dict]:
    rows = await _prices({"origin": origin, "departure_at": depart[:7], "return_at": ret[:7], "unique": "true"})
    return to_destinations(rows)
```

- [ ] **Step 4: Testleri geçir**

Run: `pytest test_travelpayouts.py -q`
Expected: `4 passed`

- [ ] **Step 5: Canlı smoke test**

```bash
python - <<'EOF'
import asyncio, travelpayouts as tp
async def main():
    print(await tp.search_places("warsaw"))
    print(await tp.city_by_iata("OSA"))
    print((await tp.flights("WAW", "TYO", "2026-10-10", "2026-10-15"))[:2])
    print((await tp.cheapest_destinations("WAW", "2026-10-10", "2026-10-15"))[:5])
asyncio.run(main())
EOF
```

Expected: dört satır, hiçbiri boş liste ya da `None` değil.

- [ ] **Step 6: Commit**

```bash
git add travelpayouts.py test_travelpayouts.py && git commit -m "feat(backend): Travelpayouts places, flights, destinations" && git pull --rebase && git push
```

---

### Task 3: `liteapi.py`

**Files:**
- Create: `backend/liteapi.py`
- Test: `backend/test_liteapi.py`

**Interfaces:**
- Produces:
  - `async stays(city: str, country_code: str, checkin: str, checkout: str, adults: int, nationality: str) -> [{name, stars, priceUsd, commissionUsd}]`
  - saf fonksiyon `parse_rates(body: dict) -> list[dict]`

- [ ] **Step 1: Failing test — `backend/test_liteapi.py`**

Aşağıdaki örnek gövde Task 1 Step 4'teki kontrol listesinin varsayımına göre yazıldı. Gerçek yanıt farklıysa önce bu örneği düzelt.

```python
from liteapi import parse_rates


def rate(amount, commission=None):
    r = {"retailRate": {"total": [{"amount": amount, "currency": "USD"}]}}
    if commission is not None:
        r["commission"] = [{"amount": commission, "currency": "USD"}]
    return r


BODY = {
    "data": [
        {"hotelId": "h1", "roomTypes": [{"offerId": "o1", "rates": [rate(210.0, 10.0)]}]},
        {"hotelId": "h2", "roomTypes": [{"offerId": "o2", "rates": [rate(105.0)]}]},
        {"hotelId": "h3", "roomTypes": []},
    ],
    "hotels": [
        {"id": "h1", "name": "Hotel Kansai Namba", "stars": 3},
        {"id": "h2", "name": "Dotonbori Inn", "stars": 4},
    ],
}


def test_parses_name_stars_price():
    out = parse_rates(BODY)
    assert out[0] == {"name": "Hotel Kansai Namba", "stars": 3, "priceUsd": 210.0, "commissionUsd": 10.0}


def test_commission_falls_back_to_margin_math():
    out = parse_rates(BODY)
    assert out[1]["commissionUsd"] == 5.0          # 105 * 5 / 105


def test_skips_hotels_without_rates():
    assert len(parse_rates(BODY)) == 2
```

- [ ] **Step 2: Fail ettiğini gör**

Run: `pytest test_liteapi.py -q`
Expected: FAIL, `ModuleNotFoundError: No module named 'liteapi'`

- [ ] **Step 3: `backend/liteapi.py`**

```python
import os

import httpx

KEY = os.environ.get("LITEAPI_KEY", "")
MARGIN = 5


def parse_rates(body: dict) -> list[dict]:
    info = {h["id"]: h for h in body.get("hotels", [])}
    out = []
    for d in body.get("data", []):
        try:
            r = d["roomTypes"][0]["rates"][0]
            total = float(r["retailRate"]["total"][0]["amount"])
        except (KeyError, IndexError):
            continue
        commission = r.get("commission")
        commission_usd = float(commission[0]["amount"]) if commission else round(total * MARGIN / (100 + MARGIN), 2)
        h = info.get(d["hotelId"], {})
        out.append({"name": h.get("name", d["hotelId"]), "stars": h.get("stars") or 0,
                    "priceUsd": total, "commissionUsd": commission_usd})
    return out


async def stays(city: str, country_code: str, checkin: str, checkout: str, adults: int, nationality: str) -> list[dict]:
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            "https://api.liteapi.travel/v3.0/hotels/rates",
            headers={"X-API-Key": KEY, "accept": "application/json"},
            json={
                "cityName": city, "countryCode": country_code, "checkin": checkin, "checkout": checkout,
                "currency": "USD", "guestNationality": nationality,
                "occupancies": [{"adults": adults}],  # ponytail: one room for everyone
                "margin": MARGIN, "limit": 30, "maxRatesPerHotel": 1,
            },
        )
        r.raise_for_status()
        return parse_rates(r.json())
```

- [ ] **Step 4: Testleri geçir**

Run: `pytest test_liteapi.py -q`
Expected: `3 passed`

- [ ] **Step 5: Canlı smoke test**

```bash
python -c "import asyncio, liteapi; print(asyncio.run(liteapi.stays('Osaka','JP','2026-10-10','2026-10-15',1,'PL'))[:3])"
```

Expected: adı, yıldızı ve fiyatı dolu 3 otel.

- [ ] **Step 6: Commit**

```bash
git add liteapi.py test_liteapi.py && git commit -m "feat(backend): LiteAPI hotel rates with 5% margin" && git pull --rebase && git push
```
