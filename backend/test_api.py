import json
from pathlib import Path

from fastapi.testclient import TestClient

import main

client = TestClient(main.app)
FIX = Path(__file__).parent / "fixtures"


def body(name):
    return json.loads((FIX / name).read_text())


def test_health():
    assert client.get("/health").json() == {"ok": True}


def test_plan_fixture_shape():
    r = client.post("/plan", json=body("plan_request.json"))
    assert r.status_code == 200
    assert set(r.json()) >= {"destination", "currencies", "budget", "flights", "stays",
                             "activities", "food", "sources", "errors"}


def test_rejects_return_before_depart():
    b = body("plan_request.json")
    b["trip"]["returnDate"] = "2026-10-01"
    assert client.post("/plan", json=b).status_code == 422


def test_rejects_empty_activities():
    b = body("suggest_request.json")
    b["profile"]["activities"] = []
    assert client.post("/suggest", json=b).status_code == 422
