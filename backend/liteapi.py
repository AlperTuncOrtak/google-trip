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
