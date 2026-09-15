# Google Trip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Profil, bütçe ve destinasyona göre uçuş, konaklama, aktivite ve yemek öneren, Wolfy maskotlu Expo mobil uygulaması ve onu besleyen FastAPI backend'i.

**Architecture:** Tek bir FastAPI servisi (Cloud Run) Travelpayouts, LiteAPI, Gemini (Maps grounding) ve open.er-api.com'u paralel çağırır, bütçe hesabını yapar, sonucu tek JSON olarak döner. Expo Router uygulamasında 4 ekran var, veri sadece bellekte (React context) tutulur.

**Tech Stack:** Python 3.12+ (local 3.13), FastAPI, httpx, pydantic v2, google-genai ≥ 2.3.0 (Interactions API), pytest · Expo (create-expo-app@latest, Expo Router, TypeScript), @react-native-community/datetimepicker · Google Cloud Run

**Spec:** `docs/superpowers/specs/2026-09-15-google-trip-design.md`

## Global Constraints

- Arayüz dili İngilizce, uygulama adı `Google Trip`, maskot adı `Wolfy`.
- Backend'de tüm fiyatlar USD. Mobile `{ home, local }` biçiminde gider.
- LiteAPI `margin = 5`.
- Her kategoride 5 sonuç, "Suggest for me" için 3 öneri.
- Diyet enum'u: `none | vegetarian | vegan | halal | gluten_free`, varsayılan `none`.
- Yolcu sayısı 1–9, `budget > 0`, `returnDate > departDate`.
- Aktiviteler: `Nature & Hiking, Museums & History, Nightlife, Beach & Sea, Adventure Sports, Shopping, Street Food, Art & Concerts`
- Gemini modeli: `gemini-3.8-flash`
- Ortam değişkenleri: `GEMINI_API_KEY`, `LITEAPI_KEY`, `TRAVELPAYOUTS_TOKEN`, `TRAVELPAYOUTS_MARKER`. Anahtar hiçbir zaman mobil koda ya da git'e girmez.
- Mobilde `DEMO_MODE = true`.
- Bütçeyi aşan öğeler `overBudget: true` olarak işaretlenir. Liste fiyata göre artan sıralı.
- Maps kaynakları Activities ve Food sekmelerinin altında listelenir (Google atıf şartı).

---

## İş bölümü (5 track, her biri ayrı dosya)

Her track kendi dosyalarına dokunur, dosyalar çakışmaz. `git pull --rebase && git push` ile sık sık `main`'e gönderin.

| Track | Sorumlu | Plan dosyası | Dokunduğu dosyalar |
|---|---|---|---|
| 1. Backend çekirdek ve deploy | Kişi 1 | `2026-09-15-track1-backend-core.md` | `backend/main.py`, `models.py`, `budget.py`, `currency.py`, `fixtures/`, `Dockerfile`, testler |
| 2. Seyahat API'leri | Kişi 2 | `2026-09-15-track2-travel-apis.md` | `backend/travelpayouts.py`, `backend/liteapi.py`, testler |
| 3. Gemini | Kişi 3 | `2026-09-15-track3-gemini.md` | `backend/gemini.py`, testler |
| 4. Mobil: iskelet, Profile, Trip | Kişi 4 | `2026-09-15-track4-mobile-core.md` | `mobile/app/_layout.tsx`, `index.tsx`, `trip.tsx`, `mobile/lib/*`, `components/Wolfy.tsx` |
| 5. Mobil: Suggestions, Results | Kişi 5 | `2026-09-15-track5-mobile-results.md` | `mobile/app/suggestions.tsx`, `results.tsx`, `mobile/lib/useRequest.ts`, `mobile/components/WolfyStatus.tsx`, `mobile/components/ResultCards.tsx` |

## Zaman çizelgesi (T0 = başlangıç)

| Süre | Ne olacak |
|---|---|
| T0 – 0:20 | **Track 1 Task 1** (`models.py` + fixture'lar) ve **Track 4 Task 1** (Expo iskeleti + `api.ts` tipleri) önce biter ve push edilir. Diğer herkes bu arada anahtar alır ve kendi Task 1 spike'ını yapar. |
| 0:20 – 2:45 | Herkes kendi track'ini paralel olarak kodlar. Mobil taraf fixture döndüren backend'e karşı çalışır. |
| 2:45 – 3:30 | **Entegrasyon** (bu dosyadaki Task I1–I3): gerçek modüller `main.py`'ye bağlanır, Cloud Run'a deploy edilir, telefonda uçtan uca test yapılır. |
| 3:30 – 4:30 | Wolfy animasyonu ve cila, hata düzeltme. |
| 4:30 – 5:00 | Pitch provası. Demo için önbellek önceden ısıtılır (Task I3). |

## Modüller arası sözleşme

Tüm track'ler bu isimleri kullanır. Tanımları Track 1 `backend/models.py`'de, Track 4 `mobile/lib/api.ts`'de yazar.

**Backend modül fonksiyonları** (hepsi `async`, hata durumunda exception fırlatır):

```python
# backend/travelpayouts.py  (Track 2)
async def search_places(term: str) -> list[dict]          # [{name, iata, countryCode, countryName, currency}]
async def list_countries() -> list[dict]                   # [{code, name, currency}]
async def city_by_name(name: str, country_code: str) -> dict | None   # {name, iata, countryCode, countryName, currency}
async def city_by_iata(iata: str) -> dict | None           # aynı şekil
async def flights(origin: str, destination: str, depart: str, ret: str) -> list[dict]
    # [{airline, departAt, returnAt, transfers, priceUsd, url, seenAt}]
async def cheapest_destinations(origin: str, depart: str, ret: str) -> list[dict]
    # [{iata, priceUsd}]

# backend/liteapi.py  (Track 2)
async def stays(city: str, country_code: str, checkin: str, checkout: str,
                adults: int, nationality: str) -> list[dict]
    # [{name, stars, priceUsd, commissionUsd}]

# backend/gemini.py  (Track 3)
async def pick_city(country_name: str, profile: dict) -> dict        # {city, reason}
async def rank_suggestions(candidates: list[dict], profile: dict, trip: dict) -> list[dict]
    # candidates: [{iata, city, countryName, priceUsd}] -> [{iata, reason}] (en fazla 3)
async def places(city: str, country_name: str, local_currency: str, profile: dict) -> dict
    # {activities:[{name, description}]x5, food:[{name, description}]x5,
    #  dailySpendLocalPerPerson: float, sources:[{title, uri}]}

# backend/currency.py  (Track 1)
async def usd_rates() -> dict[str, float]
def to_money(usd: float, rates: dict, home: str, local: str) -> dict  # {home, local}

# backend/budget.py  (Track 1)
def apply_budget(budget_usd, daily_usd_per_person, days, travelers, flights, stays) -> dict
```

**HTTP sözleşmesi:** spec §7.1'deki JSON şekilleri birebir geçerli.

---

## Entegrasyon görevleri (T+2:45, Kişi 1 yönetir, herkes katılır)

### Task I1: Gerçek modülleri `main.py`'ye bağla

**Files:**
- Modify: `backend/main.py`

**Interfaces:**
- Consumes: yukarıdaki tüm modül fonksiyonları
- Produces: gerçek `/places`, `/countries`, `/suggest`, `/plan`

- [ ] **Step 1:** `backend/main.py` içinde `USE_FIXTURES = True` satırını `False` yap (Track 1 Task 4 bu bayrağı ekler).
- [ ] **Step 2:** Local'de backend'i çalıştır:

```bash
cd backend && set -a && source .env && set +a && uvicorn main:app --reload --port 8000
```

- [ ] **Step 3:** Smoke test:

```bash
curl -s "localhost:8000/places?term=warsaw" | python3 -m json.tool | head -20
curl -s -X POST localhost:8000/plan -H 'content-type: application/json' -d @fixtures/plan_request.json | python3 -m json.tool | head -60
```

Beklenen: `flights` ve `stays` dolu, `errors` alanındaki tüm değerler `null`.
- [ ] **Step 4:** Tüm testleri çalıştır: `cd backend && pytest -q`. Beklenen: hepsi PASS.
- [ ] **Step 5:** Commit:

```bash
git add backend/main.py && git commit -m "feat: wire real providers into API"
```

### Task I2: Cloud Run deploy ve mobili bağla

**Files:**
- Modify: `mobile/lib/api.ts` (`BASE_URL`)

- [ ] **Step 1:** Deploy:

```bash
cd backend && gcloud run deploy google-trip-api --source . --region us-central1 \
  --allow-unauthenticated --min-instances 1 --timeout 120 \
  --set-env-vars "GEMINI_API_KEY=$GEMINI_API_KEY,LITEAPI_KEY=$LITEAPI_KEY,TRAVELPAYOUTS_TOKEN=$TRAVELPAYOUTS_TOKEN,TRAVELPAYOUTS_MARKER=$TRAVELPAYOUTS_MARKER"
```

- [ ] **Step 2:** Çıkan URL ile Step I1'deki curl komutlarını tekrar çalıştır.
- [ ] **Step 3:** `mobile/lib/api.ts` içindeki `BASE_URL`'i Cloud Run URL'si yap. Expo Go'da Profile → Trip → Suggest → Results akışını baştan sona dene.
- [ ] **Step 4:** Commit:

```bash
git add mobile/lib/api.ts && git commit -m "chore: point mobile to Cloud Run"
```

### Task I3: Demo önbelleğini ısıt

- [ ] **Step 1:** Pitch'te kullanılacak profil, tarih ve ülkeyle uygulamada bir kez "Plan my trip" ve bir kez "Suggest for me" çalıştır. Aynı istekler `--min-instances 1` sayesinde önbellekten anında döner.
- [ ] **Step 2:** Pitch öncesi kontrol: `DEMO_MODE = true` mi, telefon internete bağlı mı, Expo Go'da uygulama açık mı?
