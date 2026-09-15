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
