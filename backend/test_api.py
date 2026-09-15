import json
from pathlib import Path

from fastapi.testclient import TestClient

import currency
import main
import travelpayouts

client = TestClient(main.app)
FIX = Path(__file__).parent / "fixtures"


def body(name):
    return json.loads((FIX / name).read_text())


def offline(monkeypatch):
    """No API keys, no network: every provider falls back to samples."""
    for k in ("GEMINI_API_KEY", "TRAVELPAYOUTS_TOKEN", "LITEAPI_KEY"):
        monkeypatch.delenv(k, raising=False)
    japan = {"code": "JP", "name": "Japan", "currency": "JPY"}
    osaka = {"name": "Osaka", "iata": "OSA", "countryCode": "JP", "countryName": "Japan", "currency": "JPY"}

    async def countries():
        return [japan]

    async def city(*_):
        return osaka

    async def rates():
        return {"USD": 1.0, "PLN": 4.0, "JPY": 150.0}

    monkeypatch.setattr(travelpayouts, "list_countries", countries)
    monkeypatch.setattr(travelpayouts, "city_by_name", city)
    monkeypatch.setattr(travelpayouts, "city_by_iata", city)
    async def photo(_):
        return ""

    monkeypatch.setattr(currency, "usd_rates", rates)
    monkeypatch.setattr(main, "city_photo", photo)
    main._cache.clear()


def test_health():
    assert client.get("/health").json()["ok"] is True


def test_plan_with_sample_providers(monkeypatch):
    offline(monkeypatch)
    r = client.post("/plan", json=body("plan_request.json"))
    assert r.status_code == 200
    d = r.json()
    assert d["destination"]["city"] == "Osaka"
    assert d["currencies"] == {"home": "PLN", "local": "JPY"}
    assert len(d["flights"]) == 5 and len(d["stays"]) == 5 and len(d["food"]) == 5
    assert d["sample"] == ["flights", "stays", "places"]
    assert d["budget"]["total"]["home"] == 9000.0
    assert all(v is None for v in d["errors"].values())


def test_rejects_return_before_depart():
    b = body("plan_request.json")
    b["trip"]["returnDate"] = "2026-10-01"
    assert client.post("/plan", json=b).status_code == 422


def test_rejects_empty_activities():
    b = body("suggest_request.json")
    b["profile"]["activities"] = []
    assert client.post("/suggest", json=b).status_code == 422
