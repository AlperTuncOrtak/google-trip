import httpx

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
    cities = [to_city(r["code"], r["name"], r["country_code"], countries) for r in rows if r.get("name")]
    close = [c for c in cities if term.strip().lower() in c["name"].lower()]  # autocomplete pads with fuzzy noise
    return (close or cities[:3])[:8]


async def city_by_name(name: str, country_code: str) -> dict | None:
    return next((c for c in await search_places(name) if c["countryCode"] == country_code), None)


async def city_by_iata(iata: str) -> dict | None:
    countries = await _countries_by_code()
    for c in await _data("cities"):
        if c.get("code") == iata and c.get("name"):
            return to_city(c["code"], c["name"], c["country_code"], countries)
    return None
