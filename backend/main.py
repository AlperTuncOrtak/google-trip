import json
from pathlib import Path

from fastapi import FastAPI

from models import PlanRequest, SuggestRequest

USE_FIXTURES = True
FIX = Path(__file__).parent / "fixtures"
app = FastAPI(title="Google Trip API")


def fixture(name: str):
    return json.loads((FIX / name).read_text())


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/places")
async def places(term: str):
    return fixture("places.json")


@app.get("/countries")
async def countries():
    return fixture("countries.json")


@app.post("/suggest")
async def suggest(req: SuggestRequest):
    return fixture("suggest_response.json")


@app.post("/plan")
async def plan(req: PlanRequest):
    return fixture("plan_response.json")
