"""Stand-in data for providers whose API key is not configured yet.

Same function signatures as travelpayouts / liteapi / gemini, so main.py can swap
them per provider. Every response built from these is flagged in `sample`.
"""
import currency
import travelpayouts

# demo-friendly city per country, keyed by ISO code; IATA city codes match Travelpayouts cities.json
POPULAR = {
    "JP": ("Osaka", "OSA"), "ES": ("Barcelona", "BCN"), "TR": ("Istanbul", "IST"), "IT": ("Rome", "ROM"),
    "FR": ("Paris", "PAR"), "GB": ("London", "LON"), "PT": ("Lisbon", "LIS"), "GR": ("Athens", "ATH"),
    "DE": ("Berlin", "BER"), "NL": ("Amsterdam", "AMS"), "US": ("New York", "NYC"), "TH": ("Bangkok", "BKK"),
}
# rough round-trip economy fares from central Europe, USD per person
FARES = {"BCN": 190, "IST": 210, "ROM": 170, "PAR": 160, "LON": 150, "LIS": 230, "ATH": 220,
         "BER": 120, "AMS": 140, "NYC": 620, "BKK": 780, "OSA": 850}


async def pick_city(country_name: str, profile: dict) -> dict:
    code = next((c["code"] for c in await travelpayouts.list_countries() if c["name"] == country_name), "")
    city = POPULAR.get(code, (None,))[0]
    if not city:
        city = next((c["name"] for c in await travelpayouts._data("cities")
                     if c.get("country_code") == code and c.get("name")), country_name)
    return {"city": city, "reason": f"A great base in {country_name} for the things you love."}


async def rank_suggestions(candidates: list[dict], profile: dict, trip: dict) -> list[dict]:
    likes = ", ".join(profile.get("activities", [])[:2]).lower() or "your interests"
    return [{"iata": c["iata"], "reason": f"Fits your budget and great for {likes}."} for c in candidates[:3]]


async def cheapest_destinations(origin: str, depart: str, ret: str) -> list[dict]:
    return sorted(({"iata": k, "priceUsd": float(v)} for k, v in FARES.items() if k != origin),
                  key=lambda c: c["priceUsd"])


async def flights(origin: str, destination: str, depart: str, ret: str) -> list[dict]:
    base = FARES.get(destination, 450)
    dd = lambda d: d[8:10] + d[5:7]
    url = f"https://www.aviasales.com/search/{origin}{dd(depart)}{destination}{dd(ret)}1"
    legs = [("LO", 1, 1.0), ("LH", 1, 1.12), ("TK", 1, 1.25), ("KL", 0, 1.5), ("AF", 2, 1.9)]
    return [{"airline": a, "departAt": f"{depart}T08:30:00", "returnAt": f"{ret}T18:10:00", "transfers": t,
             "priceUsd": round(base * k), "url": url, "seenAt": ""} for a, t, k in legs]


async def stays(city: str, country_code: str, checkin: str, checkout: str, adults: int, nationality: str) -> list[dict]:
    return [{"name": f"Sample hotel {i + 1}, {city}", "stars": s, "priceUsd": p}
            for i, (s, p) in enumerate([(3, 420), (4, 610), (4, 780), (5, 1150), (5, 1900)])]


async def places(city: str, country_name: str, local_currency: str, profile: dict) -> dict:
    rates = await currency.usd_rates()
    diet = profile.get("diet", "none").replace("_", "-")
    activities = ["Old town walking tour", "City history museum", "Street food market", "Sunset viewpoint", "Local art district"]
    return {
        "activities": [{"name": f"{a} · {city}", "description": "Sample idea — real places arrive with Gemini."} for a in activities],
        "food": [{"name": f"Sample restaurant {i + 1} · {city}",
                  "description": ("Serves " + diet + " dishes" if diet != "none" else "Popular local spot") + " (sample)."}
                 for i in range(5)],
        "dailySpendLocalPerPerson": round(70 * rates.get(local_currency, 1.0), 2),
        "sources": [],
    }
