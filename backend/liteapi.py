import os

import httpx

KEY = os.environ.get("LITEAPI_KEY", "")


def parse_rates(body: dict) -> list[dict]:
    info = {h["id"]: h for h in body.get("hotels", [])}
    out = []
    for d in body.get("data", []):
        try:
            total = float(d["roomTypes"][0]["rates"][0]["retailRate"]["total"][0]["amount"])
        except (KeyError, IndexError):
            continue
        h = info.get(d["hotelId"], {})
        out.append({"name": h.get("name", d["hotelId"]), "stars": h.get("stars") or 0, "priceUsd": total})
    return out


async def stays(city: str, country_code: str, checkin: str, checkout: str, adults: int, nationality: str) -> list[dict]:
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            "https://api.liteapi.travel/v3.0/hotels/rates",
            headers={"X-API-Key": os.environ.get("LITEAPI_KEY", KEY), "accept": "application/json"},
            json={
                "cityName": city, "countryCode": country_code, "checkin": checkin, "checkout": checkout,
                "currency": "USD", "guestNationality": nationality,
                "occupancies": [{"adults": adults}],  # ponytail: one room for everyone
                "margin": 0, "limit": 30, "maxRatesPerHotel": 1,  # no markup: show the plain rate
            },
        )
        r.raise_for_status()
        return parse_rates(r.json())
