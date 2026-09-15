from liteapi import parse_rates


def rate(amount):
    return {"retailRate": {"total": [{"amount": amount, "currency": "USD"}]}}


BODY = {
    "data": [
        {"hotelId": "h1", "roomTypes": [{"offerId": "o1", "rates": [rate(210.0)]}]},
        {"hotelId": "h2", "roomTypes": [{"offerId": "o2", "rates": [rate(105.0)]}]},
        {"hotelId": "h3", "roomTypes": []},
    ],
    "hotels": [
        {"id": "h1", "name": "Hotel Kansai Namba", "stars": 3},
        {"id": "h2", "name": "Dotonbori Inn", "stars": 4},
    ],
}


def test_parses_name_stars_price():
    assert parse_rates(BODY)[0] == {"name": "Hotel Kansai Namba", "stars": 3, "priceUsd": 210.0}


def test_skips_hotels_without_rates():
    assert len(parse_rates(BODY)) == 2
