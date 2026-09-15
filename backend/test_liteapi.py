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
