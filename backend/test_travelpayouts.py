import asyncio

import travelpayouts as tp


def test_search_places_drops_fuzzy_noise(monkeypatch):
    async def fake_get(url, params):
        return [{"code": "IST", "name": "Istanbul", "country_code": "TR"},
                {"code": "ELS", "name": "East London", "country_code": "ZA"}]

    async def fake_countries():
        return {"TR": {"name": "Turkiye", "currency": "TRY"}}

    monkeypatch.setattr(tp, "_get", fake_get)
    monkeypatch.setattr(tp, "_countries_by_code", fake_countries)
    assert [c["name"] for c in asyncio.run(tp.search_places("ist"))] == ["Istanbul"]
    assert [c["name"] for c in asyncio.run(tp.search_places("xyz"))] == ["Istanbul", "East London"]


def test_to_city_uses_country_currency():
    countries = {"PL": {"code": "PL", "name": "Poland", "currency": "PLN"}}
    assert tp.to_city("WAW", "Warsaw", "PL", countries) == {
        "name": "Warsaw", "iata": "WAW", "countryCode": "PL", "countryName": "Poland", "currency": "PLN"}
