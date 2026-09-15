import asyncio
import json
import os

from google import genai
from pydantic import BaseModel, Field

MODEL = "gemini-3.8-flash"
TIMEOUT = 40
_client = None

DIETS = {
    "none": "No dietary restriction.",
    "vegetarian": "Vegetarian only: every food place must clearly offer vegetarian dishes.",
    "vegan": "Vegan only: every food place must clearly offer vegan dishes.",
    "halal": "Halal only: every food place must be halal or clearly offer halal food.",
    "gluten_free": "Gluten-free only: every food place must clearly offer gluten-free dishes.",
}


class CityPick(BaseModel):
    city: str = Field(description="English name of one city in the given country")
    reason: str = Field(description="One sentence, at most 20 words, addressed to the traveler")


class Ranked(BaseModel):
    iata: str = Field(description="IATA code copied exactly from the candidate list")
    reason: str = Field(description="One sentence, at most 20 words")


class RankedList(BaseModel):
    items: list[Ranked]


class Place(BaseModel):
    name: str
    description: str = Field(description="At most 15 words")


class PlacesOut(BaseModel):
    activities: list[Place]
    food: list[Place]
    dailySpendLocalPerPerson: float = Field(description="Typical daily food + activities spend for one person, local currency")


def client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    return _client


def diet_rule(diet: str) -> str:
    return DIETS.get(diet, DIETS["none"])


def profile_text(profile: dict) -> str:
    likes = ", ".join(profile.get("activities", [])) or "anything"
    note = profile.get("activitiesNote", "").strip()
    return f"Traveler likes: {likes}." + (f" Also: {note}." if note else "") + f" Diet: {diet_rule(profile.get('diet', 'none'))}"


def candidates_text(candidates: list[dict]) -> str:
    return "\n".join(f"{c['iata']} | {c['city']}, {c['countryName']} | flight ${c['priceUsd']:.0f}" for c in candidates)


def extract_sources(interaction) -> list[dict]:
    seen, out = set(), []
    for step in interaction.steps or []:
        if step.type != "model_output":
            continue
        for block in step.content or []:
            for a in getattr(block, "annotations", None) or []:
                if a.type == "place_citation" and a.url and a.url not in seen:
                    seen.add(a.url)
                    out.append({"title": a.name, "uri": a.url})
    return out


def _json(prompt: str, model: type[BaseModel]) -> BaseModel:
    it = client().interactions.create(
        model=MODEL,
        input=prompt,
        response_format={"type": "text", "mime_type": "application/json", "schema": model.model_json_schema()},
    )
    return model.model_validate(json.loads(it.output_text))


async def _run(fn, *args):
    return await asyncio.wait_for(asyncio.to_thread(fn, *args), TIMEOUT)


async def pick_city(country_name: str, profile: dict) -> dict:
    prompt = (f"Choose the single best city in {country_name} for this traveler. "
              f"It must have an airport. {profile_text(profile)}")
    return (await _run(_json, prompt, CityPick)).model_dump()


async def rank_suggestions(candidates: list[dict], profile: dict, trip: dict) -> list[dict]:
    prompt = (f"{profile_text(profile)} Budget: {trip['budget']} in their home currency for "
              f"{trip['travelers']} traveler(s), {trip['departDate']} to {trip['returnDate']}.\n"
              f"Pick the 3 best destinations ONLY from this list, best first. Prefer cheaper flights when similar.\n"
              f"{candidates_text(candidates)}")
    ranked = await _run(_json, prompt, RankedList)
    return [r.model_dump() for r in ranked.items[:3]]


def _grounded(prompt: str):
    it = client().interactions.create(model=MODEL, input=prompt, tools=[{"type": "google_maps"}])
    return it.output_text, extract_sources(it)


async def places(city: str, country_name: str, local_currency: str, profile: dict) -> dict:
    ask = (f"Traveler visiting {city}, {country_name}. {profile_text(profile)}\n"
           f"1) List 5 activities or attractions in {city} matching what they like.\n"
           f"2) List 5 restaurants in {city}. {diet_rule(profile.get('diet', 'none'))}\n"
           f"3) Estimate typical daily spend for one person on food and activities in {local_currency}.\n"
           f"Use real places from Google Maps. Answer in English.")
    text, sources = await _run(_grounded, ask)
    structure = (f"Convert these notes to JSON. Keep exactly 5 activities and 5 food places if available. "
                 f"Drop any food place that does not satisfy: {diet_rule(profile.get('diet', 'none'))}\n\n{text}")
    out = await _run(_json, structure, PlacesOut)
    return {"activities": [p.model_dump() for p in out.activities[:5]],
            "food": [p.model_dump() for p in out.food[:5]],
            "dailySpendLocalPerPerson": out.dailySpendLocalPerPerson,
            "sources": sources}
