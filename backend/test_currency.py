from currency import to_money


def test_converts_to_both_currencies():
    rates = {"USD": 1, "PLN": 4.0, "JPY": 150.0}
    assert to_money(10, rates, "PLN", "JPY") == {"home": 40.0, "local": 1500.0}


def test_unknown_currency_falls_back_to_usd():
    assert to_money(10, {"USD": 1}, "XXX", "USD") == {"home": 10.0, "local": 10.0}
