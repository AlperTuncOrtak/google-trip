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
