# Google Trip

**Meet Wolfy, your AI travel buddy.** Tell Wolfy what you love, your diet and your budget. You get real flights, real hotels, and activities and restaurants picked by Gemini with Google Maps, all checked against your budget and priced in two currencies.

Built at the **Google Student AI Hackathon**, Warsaw, September 2026.

## Features

- **Activity-based planning.** Pick interests such as street food or museums, and a diet (vegetarian, vegan, halal, gluten-free).
- **Pick a country or let Wolfy suggest one.** Gemini picks the best city for you and explains why.
- **Budget check.** Flights, stays and a daily spend estimate are fitted to your all-in budget. Options over budget are flagged.
- **Two currencies.** Every price is shown in your home currency and the destination currency.
- **Real places.** Activities and restaurants come from Gemini with Google Maps grounding, with Maps source links.
- **Share your trip** as a text summary.

## Tech stack

| Layer | Technology |
|---|---|
| Mobile | TypeScript, React Native (Expo SDK 57), Expo Router, Reanimated |
| Backend | Python 3.13, FastAPI, Pydantic v2, httpx / asyncio, pytest |
| AI | Google Gemini: `gemini-3.8-flash` with Grounding with Google Maps, `gemini-3.5-flash-lite` for structured JSON |
| Data | Google Flights (via SerpApi), LiteAPI (hotels), Travelpayouts (city search, countries, airports), open.er-api.com (exchange rates), Wikipedia (city photos) |
| Infra | Docker (ready for Google Cloud Run), GitHub |

## Architecture

```
Expo app (iOS / Android / web)
        │  JSON over HTTP
        ▼
FastAPI backend ──┬── Gemini + Google Maps grounding
                  ├── Google Flights (SerpApi)
                  ├── LiteAPI
                  ├── Travelpayouts
                  ├── open.er-api.com
                  └── Wikipedia
```

A single `/plan` request builds the whole trip. The backend calls every provider in parallel and caches the result in memory. If a provider has no API key, it falls back to sample data, and the app labels that tab "Sample data".

## Run locally

**Backend**

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Optional API keys go in `backend/.env`. This file is git-ignored. The app runs without keys, using sample data.

```
GEMINI_API_KEY=...
LITEAPI_KEY=...
SERPAPI_KEY=...
```

**Mobile**

```bash
cd mobile
npm install
npx expo start
```

Set `BASE_URL` in `mobile/src/lib/api.ts` to your backend address. Then open the app in Expo Go, or press `w` for the web version.

**Tests**

```bash
cd backend && pytest -q
```

## Team

A 5-person team at the Google Student AI Hackathon, Warsaw.
