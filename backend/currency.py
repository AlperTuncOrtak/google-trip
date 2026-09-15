import logging
import time

import httpx

_cache = {"at": 0.0, "rates": {}}


async def usd_rates() -> dict[str, float]:
    if _cache["rates"] and time.time() - _cache["at"] < 3600:
        return _cache["rates"]
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get("https://open.er-api.com/v6/latest/USD")
        r.raise_for_status()
        _cache.update(at=time.time(), rates=r.json()["rates"])
    return _cache["rates"]


def _rate(rates: dict, code: str) -> float:
    if code not in rates:
        logging.warning("no rate for %s, showing USD", code)
    return rates.get(code, 1.0)


def to_money(usd: float, rates: dict, home: str, local: str) -> dict:
    return {"home": round(usd * _rate(rates, home), 2), "local": round(usd * _rate(rates, local), 2)}
