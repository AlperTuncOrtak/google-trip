# Track 3: Gemini (şehir seçimi, öneri sıralama, Maps grounding)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `pick_city`, `rank_suggestions` ve `places` fonksiyonlarını içeren `backend/gemini.py`.

**Architecture:** google-genai SDK'nın Interactions API'si kullanılır. JSON gereken yerlerde `response_format` ile şema verilir. Maps grounding structured output ile birleşemediği için `places` iki çağrı yapar: (1) Maps araçlı serbest metin ve kaynaklar, (2) araçsız çağrıyla metni JSON'a çevirme. SDK senkron olduğu için çağrılar `asyncio.to_thread` ile paralel çalıştırılır.

**Tech Stack:** Python 3.12+ (local 3.13), google-genai ≥ 2.3.0, pydantic v2, pytest

**Spec:** `docs/superpowers/specs/2026-09-15-google-trip-design.md`
**Ana plan:** `docs/superpowers/plans/2026-09-15-google-trip.md` (Global Constraints ve sözleşme geçerli)

---

### Task 1: Spike, anahtar ve Maps grounding doğrulaması (T0 – 0:45)

**Files:**
- Create: `backend/.env` içine `GEMINI_API_KEY` (Track 2 dosyayı oluşturduysa sadece satırı ekle)
- Create: `backend/spike_gemini.py` (geçici, commit edilmez)

- [ ] **Step 1: Anahtar**

Google'ın verdiği anahtarı (ya da https://aistudio.google.com/apikey adresinden alınan anahtarı) `backend/.env` dosyasına `GEMINI_API_KEY=...` olarak ekle. Anahtarı sohbete, koda ya da commit'e koyma.

- [ ] **Step 2: `backend/spike_gemini.py`**

```python
import os
from google import genai

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
it = client.interactions.create(
    model="gemini-3.8-flash",
    input="List 3 halal restaurants and 3 museums in Osaka, Japan. One line each.",
    tools=[{"type": "google_maps"}],
)
print("TEXT:\n", it.output_text)
for step in it.steps:
    if step.type == "model_output":
        for block in step.content:
            for a in (getattr(block, "annotations", None) or []):
                print("ANNOTATION:", a.type, getattr(a, "name", None), getattr(a, "url", None))
```

- [ ] **Step 3: Çalıştır**

Run: `cd backend && set -a && source .env && set +a && python spike_gemini.py`
Expected: `TEXT:` altında 6 satır, altında en az bir `ANNOTATION: place_citation <isim> <url>` satırı.

Sonuca göre:
- **`output_text` ya da `steps` yoksa** ya da hata dönüyorsa `pip install -U "google-genai>=2.3.0"` ile SDK'yı güncelle ve tekrar dene.
- **Annotation farklı alanlarla geliyorsa** Task 2'deki `extract_sources` fonksiyonunu ve testteki sahte nesneyi gerçek alan adlarına göre düzelt.
- **Maps aracı bölgede çalışmıyorsa** (hata: tool not available) aynı kodu Cloud Run URL'si üzerinden dene (Track 1 Task 5). O da çalışmazsa ekibe haber ver. Yedek plan: `tools=[{"type": "google_search"}]` (kaynaklar Google Search'ten gelir, spec'in Maps varsayımı değişir).

- [ ] **Step 4: Structured output'u doğrula**

```python
# spike_gemini.py dosyasının sonuna ekle
import json
it2 = client.interactions.create(
    model="gemini-3.8-flash",
    input="Pick one city in Japan for a street-food lover.",
    response_format={"type": "text", "mime_type": "application/json",
                     "schema": {"type": "object", "properties": {"city": {"type": "string"}, "reason": {"type": "string"}},
                                "required": ["city", "reason"]}},
)
print(json.loads(it2.output_text))
```

Expected: `{'city': 'Osaka', 'reason': '...'}` benzeri bir dict.

- [ ] **Step 5: Sonucu ekibe yaz.** `spike_gemini.py` commit edilmez: `rm spike_gemini.py`

---

### Task 2: `gemini.py`

**Files:**
- Create: `backend/gemini.py`
- Test: `backend/test_gemini.py`

**Interfaces:**
- Consumes: `profile` dict'i (`models.Profile.model_dump()`), yani `{homeCity:{...}, activities:[str], activitiesNote:str, diet:str}`
- Produces:
  - `async pick_city(country_name: str, profile: dict) -> {"city": str, "reason": str}`
  - `async rank_suggestions(candidates: list[dict], profile: dict, trip: dict) -> [{"iata": str, "reason": str}]`, en fazla 3. `candidates` elemanları: `{iata, city, countryName, priceUsd, ...}`
  - `async places(city: str, country_name: str, local_currency: str, profile: dict) -> {"activities": [{name, description}], "food": [{name, description}], "dailySpendLocalPerPerson": float, "sources": [{title, uri}]}`
  - saf fonksiyonlar: `profile_text(profile) -> str`, `diet_rule(diet) -> str`, `extract_sources(interaction) -> list[dict]`, `candidates_text(candidates) -> str`

- [ ] **Step 1: Failing test — `backend/test_gemini.py`**

```python
from types import SimpleNamespace as NS

import gemini


PROFILE = {"homeCity": {"name": "Warsaw"}, "activities": ["Street Food", "Nightlife"],
           "activitiesNote": "jazz bars", "diet": "halal"}


def test_profile_text_includes_everything():
    t = gemini.profile_text(PROFILE)
    assert "Street Food" in t and "Nightlife" in t and "jazz bars" in t and "halal" in t.lower()


def test_diet_rule_none_is_unrestricted():
    assert "no dietary restriction" in gemini.diet_rule("none").lower()
    assert "gluten-free" in gemini.diet_rule("gluten_free").lower()


def test_extract_sources_dedupes_place_citations():
    ann = lambda n, u: NS(type="place_citation", name=n, url=u)
    it = NS(steps=[
        NS(type="thinking", content=[]),
        NS(type="model_output", content=[
            NS(annotations=[ann("Osaka Castle", "https://maps/1"), ann("Osaka Castle", "https://maps/1")]),
            NS(annotations=None),
            NS(annotations=[ann("Kuromon Market", "https://maps/2"), NS(type="url_citation", name="x", url="y")]),
        ]),
    ])
    assert gemini.extract_sources(it) == [
        {"title": "Osaka Castle", "uri": "https://maps/1"},
        {"title": "Kuromon Market", "uri": "https://maps/2"},
    ]


def test_candidates_text_one_line_each():
    t = gemini.candidates_text([{"iata": "BCN", "city": "Barcelona", "countryName": "Spain", "priceUsd": 70.0}])
    assert t == "BCN | Barcelona, Spain | flight $70"
```

- [ ] **Step 2: Fail ettiğini gör**

Run: `pytest test_gemini.py -q`
Expected: FAIL, `ModuleNotFoundError: No module named 'gemini'`

- [ ] **Step 3: `backend/gemini.py`**

```python
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
    for step in interaction.steps:
        if step.type != "model_output":
            continue
        for block in step.content:
            for a in getattr(block, "annotations", None) or []:
                if a.type == "place_citation" and a.url not in seen:
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
```

- [ ] **Step 4: Testleri geçir**

Run: `pytest test_gemini.py -q`
Expected: `4 passed`

- [ ] **Step 5: Canlı smoke test**

```bash
python - <<'EOF'
import asyncio, gemini
P = {"homeCity": {"name": "Warsaw"}, "activities": ["Street Food", "Museums & History"], "activitiesNote": "", "diet": "halal"}
async def main():
    print(await gemini.pick_city("Japan", P))
    print(await gemini.rank_suggestions(
        [{"iata": "BCN", "city": "Barcelona", "countryName": "Spain", "priceUsd": 70},
         {"iata": "IST", "city": "Istanbul", "countryName": "Turkey", "priceUsd": 120},
         {"iata": "OSA", "city": "Osaka", "countryName": "Japan", "priceUsd": 780},
         {"iata": "LON", "city": "London", "countryName": "United Kingdom", "priceUsd": 60}],
        P, {"budget": 9000, "travelers": 1, "departDate": "2026-10-10", "returnDate": "2026-10-15"}))
    r = await gemini.places("Osaka", "Japan", "JPY", P)
    print(r["activities"][:2], r["food"][:2], r["dailySpendLocalPerPerson"], len(r["sources"]))
asyncio.run(main())
EOF
```

Expected: şehir ve gerekçe; 3 öneri; aktiviteler, helal yemek yerleri, günlük harcama sayısı ve 0'dan büyük kaynak sayısı. `places` çağrısı yaklaşık 10–25 sn sürer.

- [ ] **Step 6: Commit**

```bash
git add gemini.py test_gemini.py && git commit -m "feat(backend): Gemini city pick, ranking, Maps-grounded places" && git pull --rebase && git push
```
