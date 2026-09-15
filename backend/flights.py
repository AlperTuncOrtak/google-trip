"""Live round-trip fares from Google Flights via SerpApi."""
import os

import httpx

import samples
import travelpayouts


async def airports(city_code: str) -> str:
    """Google Flights wants airport codes (HND,NRT), our cities use metro codes (TYO)."""
    rows = await travelpayouts._data("airports")
    codes = [a["code"] for a in rows
             if a.get("city_code") == city_code and a.get("iata_type") == "airport" and a.get("flightable")]
    return ",".join(codes[:3]) or city_code


def to_flights(body: dict) -> list[dict]:
    url = body.get("search_metadata", {}).get("google_flights_url", "")
    out = []
    for f in (body.get("best_flights") or []) + (body.get("other_flights") or []):
        legs = f.get("flights") or []
        if not legs or "price" not in f:
            continue
        out.append({
            "airline": legs[0].get("airline", ""),
            "departAt": legs[0]["departure_airport"].get("time", "").replace(" ", "T"),
            "returnAt": legs[-1]["arrival_airport"].get("time", "").replace(" ", "T"),  # outbound arrival
            "transfers": len(f.get("layovers") or []),
            "priceUsd": float(f["price"]),
            "url": url,
            "seenAt": "",
        })
    return out


async def flights(origin: str, destination: str, depart: str, ret: str) -> list[dict]:
    params = {
        "engine": "google_flights", "departure_id": await airports(origin), "arrival_id": await airports(destination),
        "outbound_date": depart, "return_date": ret, "currency": "USD", "hl": "en", "type": 1,
        "api_key": os.environ.get("SERPAPI_KEY", ""),
    }
    async with httpx.AsyncClient(timeout=40) as client:
        r = await client.get("https://serpapi.com/search.json", params=params)
        r.raise_for_status()
        body = r.json()
    if body.get("error") and "hasn't returned any results" not in body["error"]:
        raise RuntimeError(body["error"])
    return to_flights(body)


# destination ideas stay on sample fares: one live search per candidate would burn the monthly quota
cheapest_destinations = samples.cheapest_destinations
