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
