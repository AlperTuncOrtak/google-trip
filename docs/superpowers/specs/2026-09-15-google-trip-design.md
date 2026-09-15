# Google Trip — Tasarım Spec'i

- **Tarih:** 2026-09-15
- **Durum:** Taslak, ekip onayı bekliyor
- **Bağlam:** Google Hackathon, 5 kişi, 5 saat
- **Repo:** https://github.com/AlperTuncOrtak/google-trip

---

## 1. Amaç

Kullanıcının sevdiği aktivitelere, diyetine, bütçesine ve kalkış şehrine göre bir seyahat planı çıkaran mobil uygulama. Plan dört kategoriden oluşur: uçuş, konaklama, aktivite ve yemek. Kullanıcıya uygulama boyunca **Wolfy** adlı maskot eşlik eder. Gelir otel komisyonundan (LiteAPI) ve uçuş affiliate linklerinden (Travelpayouts) gelir.

## 2. Kapsam

**MVP'de var:**
- Wolfy (iskelette statik görsel ve konuşma balonu, animasyon sonra eklenecek)
- Uçuş ve konaklama API'leri
- Kullanıcı profili (tercihler)
- Aktivite bazlı planlama
- Para birimi çevirme

**Kapsam dışı (bu tasarıma girmez):** highlights, dil desteği, gamification, forecast/safety, buddy finder, feature seeking, pets, transport optimisation.

> Not: Health filter kapsam dışı listesindeydi, ancak **diyet tek seçimlik bir filtre olarak MVP'ye alındı** (ekip kararı).

## 3. Ekip kararları

| Konu | Karar |
|---|---|
| Mobil | React Native + Expo (Expo Go ile test) |
| Backend | FastAPI (Python), Google Cloud Run'da çalışacak |
| AI | Gemini, AI Studio API key ile |
| Uçuş | Travelpayouts. Tıklanınca affiliate linki tarayıcıda açılır |
| Otel | LiteAPI, %5 margin. Sadece liste ve fiyat, rezervasyon adımı yok |
| Aktivite ve yemek | Gemini + Grounding with Google Maps |
| Döviz | open.er-api.com |
| Mimari | **Yaklaşım A:** tek bir `/plan` endpoint'i, tüm çağrılar backend'de paralel |
| Login ve kalıcılık | Yok. Veri bellekte tutulur, uygulama her açılışta sıfırlanır |
| Kalkış şehri | Serbest arama (Travelpayouts autocomplete). Ev para birimi şehrin ülkesinden otomatik gelir |
| Aktiviteler | 8 chip ve serbest metin alanı |
| Diyet | Tek seçim: None / Vegetarian / Vegan / Halal / Gluten-free |
| Destinasyon | Kullanıcı ülke seçer ve AI şehri seçer, **ya da** "Suggest for me" der ve 3 öneri gelir |
| Öneri kartı | Ülke, AI'ın seçtiği şehir, seçilme gerekçesi ve uçuş fiyatı |
| Tarih ve kişi | Bütçeyle birlikte Trip ekranında girilir |
| Para birimi gösterimi | Ev birimi ve hedef birim yan yana |
| Bütçe kapsamı | Her şey dahil. Aktivite ve yemek için günlük sabit harcama kullanılır (Gemini tahmini) |
| Bütçeyi aşan seçenekler | Gösterilir, "Over budget" etiketiyle en altta |
| Otel sıralaması | En ucuzdan pahalıya |
| Sonuç sayısı | Her kategoride 5 |
| Öneri sayısı | 3 |
| Arayüz dili | İngilizce |
| Uygulama adı | Google Trip |
| Maskot adı | Wolfy |

## 4. Claude'un verdiği kararlar (ekip değiştirebilir)

| Konu | Karar | Gerekçe |
|---|---|---|
| Diyet varsayılanı | Başlangıçta `None` seçili | Diyeti olmayan kullanıcı ek bir işlem yapmadan devam eder |
| Form doğrulamaları | Home city ve en az 1 aktivite zorunlu. Yolcu sayısı 1–9. Gidiş tarihi bugünden sonra, dönüş gidişten sonra | API'lere geçersiz istek gitmez |
| Wolfy'nin konuşma metinleri | §5'teki İngilizce cümleler | Maskot kararı bana bırakıldı, metinler kolayca değiştirilebilir |
| Komisyon görünürlüğü | Mobilde `DEMO_MODE = true` sabiti. Açıkken otel kartında "We earn ≈ X", uçuş kartında "Affiliate link" etiketi görünür | Jüri gelir modelini canlı görür. Gerçek kullanıcı görünümü için sabit `false` yapılır |
| Wolfy'nin iskeletteki yeri | Her ekranın üstünde küçük görsel ve konuşma balonu. Yükleme ekranında büyük gösterilir | Maskot kullanıcıya yol gösterir. Animasyon sonra aynı bileşenin içine eklenir |
| Uçuş sıralaması | En ucuzdan pahalıya | Otel sıralamasıyla aynı |
| Gün sayısı | `days = nights` (dönüş tarihi − gidiş tarihi) | Basit ve açıklaması kolay |
| Öneri ön filtresi | `uçuş fiyatı × kişi ≤ bütçe` | Öneri aşamasında otel fiyatı henüz bilinmiyor |
| Bütçe çubuğu | En ucuz uçuş + en ucuz otel üzerinden hesaplanır | "Bu bütçeyle mümkün mü?" sorusunun en iyi senaryosu |
| Fiyat birimi | Tüm API'lerden fiyat USD olarak istenir, sonra çevrilir | Dönüşüm mantığı tek yerde olur |
| Oda | Tüm yolcular için 1 oda, N yetişkin | MVP basitliği |
| Maps kaynakları | Activities ve Food sekmelerinin altında kaynak listesi olarak gösterilir | Google'ın atıf şartını karşılar, kaynakları tek tek öğelerle eşleştirmeye gerek kalmaz |
| Cloud Run | `us-central1` bölgesi, `--min-instances 1` | Maps grounding bölge kısıtına karşı güvenli. Demo sırasında cold start olmaz, önbellek korunur |
| Mobil bileşenler | Sekmeler için basit segment butonları, tarih için `@react-native-community/datetimepicker`, linkler için `Linking.openURL` | Ek navigasyon ya da tarayıcı kütüphanesi gerekmez |

## 5. Kullanıcı akışı

```
Profile ──► Trip ──┬── "Plan my trip" (ülke seçili) ─────────────────► Results
                   └── "Suggest for me" ──► Suggestions (3 kart) ──tap──► Results
```

### 5.1 Profile (`app/index.tsx`), uygulamanın açılış ekranı
- **Wolfy:** "Hi, I'm Wolfy! Tell me what you love and I'll sniff out your trip."
- **Home city:** `TextInput` alanı. Kullanıcı yazdıkça (300 ms debounce) `GET /places?term=` çağrılır ve sonuçlar listelenir. Şehir seçilince altında "Currency: PLN" yazar.
- **Activities (çoklu chip):** Nature & Hiking, Museums & History, Nightlife, Beach & Sea, Adventure Sports, Shopping, Street Food, Art & Concerts
- **"Anything else?":** serbest metin alanı
- **Diet (tek seçim):** None (varsayılan), Vegetarian, Vegan, Halal, Gluten-free
- **Continue:** Home city seçilmeden ve en az 1 aktivite (chip ya da metin) girilmeden pasif kalır.

### 5.2 Trip (`app/trip.tsx`), ana menü
- **Wolfy:** "What's your budget? I'll make it stretch."
- **Budget:** sayı girilir, yanında ev para birimi yazar.
- **Departure date / Return date:** datetimepicker ile seçilir.
- **Travelers:** 1–9 arası stepper.
- **Country:** arama yapılabilen liste (`GET /countries`).
- **"Plan my trip":** Ülke seçili değilse pasif. Basınca Results ekranına geçilir.
- **"Suggest for me":** Suggestions ekranına geçilir.
- **Doğrulama:** bütçe > 0, dönüş tarihi gidişten sonra, gidiş tarihi bugünden sonra.

### 5.3 Suggestions (`app/suggestions.tsx`)
- Açılınca `POST /suggest` çağrılır. Beklerken büyük Wolfy ve "Sniffing out the best deals…" gösterilir.
- **Wolfy:** "I found 3 places you'll love!"
- 3 kart gösterilir. Her kartta "Japan → Osaka", seçilme gerekçesi ve uçuş fiyatı (`12,400 JPY ≈ 340 PLN`) yazar.
- Karta dokununca Results ekranına geçilir, şehir hazır olarak gönderilir.

### 5.4 Results (`app/results.tsx`)
- Açılınca `POST /plan` çağrılır. Beklerken büyük Wolfy ve "Sniffing out the best deals…" gösterilir.
- **Başlık:** şehir, ülke ve AI'ın gerekçesi.
- **Wolfy:** bütçe yetiyorsa "All of this fits your budget!", yetmiyorsa "It's a bit over budget — here are the cheapest options."
- **Bütçe çubuğu:** Budget / Flight + Stay / Daily spend × days / Remaining. Her tutar iki para biriminde yazar.
- **Sekmeler (segment butonları):**
  - **Flights (5):** havayolu, tarihler, aktarma sayısı, fiyat, "Over budget" etiketi, "last seen X ago" notu. Dokununca `Linking.openURL(url)` çalışır.
  - **Stays (5):** otel adı, yıldız sayısı, toplam fiyat, "Over budget" etiketi. `DEMO_MODE` açıkken "We earn ≈ X" yazar.
  - **Activities (5):** ad, kısa açıklama. En altta Google Maps kaynakları.
  - **Food (5):** ad, kısa açıklama (diyete uygun). En altta Google Maps kaynakları.
- Bir kategori hata verdiyse o sekmede "Unavailable right now" yazar, diğer sekmeler normal çalışır.
- **Hata ekranı:** Wolfy "Oops, I lost the scent. Try again?" der ve "Try again" butonu gösterilir.

## 6. Mobil yapı

```
mobile/
  app/_layout.tsx        # Stack navigator + TripProvider
  app/index.tsx          # Profile
  app/trip.tsx
  app/suggestions.tsx
  app/results.tsx
  components/Wolfy.tsx   # props: message, size ("small" | "large"); animasyon sonra buraya eklenecek
  lib/store.tsx          # React context: profile, trip, selected suggestion
  lib/api.ts             # BASE_URL, fetch helpers, TypeScript tipleri
  assets/wolfy.png       # arka planı temizlenmiş PNG
```

```ts
type Diet = "none" | "vegetarian" | "vegan" | "halal" | "gluten_free";

type Profile = {
  homeCity: { name: string; iata: string; countryCode: string; currency: string };
  activities: string[];
  activitiesNote: string;
  diet: Diet;
};

type Trip = {
  budget: number;        // ev para biriminde
  departDate: string;    // YYYY-MM-DD
  returnDate: string;    // YYYY-MM-DD
  travelers: number;     // 1–9 yetişkin
};

type Money = { home: number; local: number };
```

## 7. Backend yapısı

```
backend/
  main.py            # FastAPI app, pydantic modelleri, endpoint'ler, basit dict önbellek
  travelpayouts.py   # autocomplete, countries, prices_for_dates, affiliate URL
  liteapi.py         # hotels/rates (margin=5)
  gemini.py          # pick_city, rank_suggestions, find_places, structure_places
  currency.py        # open.er-api.com, 1 saat önbellek
  budget.py          # bütçeye sığdırma kuralları
  test_budget.py     # assert tabanlı küçük test
  requirements.txt   # fastapi, uvicorn, httpx, google-genai, pydantic
  Dockerfile
```

### 7.1 Endpoint'ler

**`GET /places?term=war`**
```json
[{ "name": "Warsaw", "iata": "WAW", "countryCode": "PL", "countryName": "Poland", "currency": "PLN" }]
```

**`GET /countries`**
```json
[{ "code": "JP", "name": "Japan", "currency": "JPY" }]
```

**`POST /suggest`**, gövde: `{ profile, trip }`
```json
{
  "suggestions": [{
    "countryCode": "JP", "countryName": "Japan",
    "city": "Osaka", "iata": "OSA",
    "localCurrency": "JPY",
    "reason": "Street food capital with great museums.",
    "flightPrice": { "home": 1340, "local": 48900 }
  }]
}
```

**`POST /plan`**, gövde: `{ profile, trip, countryCode, city?: { name, iata } }`
```json
{
  "destination": { "city": "Osaka", "iata": "OSA", "countryCode": "JP", "countryName": "Japan", "reason": "..." },
  "currencies": { "home": "PLN", "local": "JPY" },
  "budget": {
    "total": {"home":0,"local":0},
    "flightAndStay": {"home":0,"local":0},
    "dailySpendPerPerson": {"home":0,"local":0},
    "days": 5,
    "dailySpendTotal": {"home":0,"local":0},
    "remaining": {"home":0,"local":0},
    "fits": true
  },
  "flights": [{ "airline": "LO", "departAt": "...", "returnAt": "...", "transfers": 1,
                "price": {"home":0,"local":0}, "url": "https://...", "seenAt": "...", "overBudget": false }],
  "stays":   [{ "name": "...", "stars": 4, "price": {"home":0,"local":0},
                "commission": {"home":0,"local":0}, "overBudget": false }],
  "activities": [{ "name": "...", "description": "..." }],
  "food":       [{ "name": "...", "description": "..." }],
  "sources":    [{ "title": "...", "uri": "https://maps.google.com/..." }],
  "errors": { "flights": null, "stays": null, "places": null }
}
```

**Girdi doğrulama (pydantic):** `budget > 0`, `1 ≤ travelers ≤ 9`, `returnDate > departDate`, `diet` enum değerlerinden biri olmalı, `activities` ile `activitiesNote` ikisi birden boş olamaz.

### 7.2 Secret'lar
Anahtarlar sadece Cloud Run ortam değişkenlerinde, local'de ise `.env` dosyasında tutulur. `.env` `.gitignore`'a eklenir. Mobil uygulamada anahtar bulunmaz.

`GEMINI_API_KEY`, `LITEAPI_KEY`, `TRAVELPAYOUTS_TOKEN`, `TRAVELPAYOUTS_MARKER`

## 8. Veri akışı

### 8.1 `/plan`
1. **Şehir seçimi** (gövdede `city` yoksa): `gemini.pick_city(countryName, profile)` structured output döner: `{ city, reason }`. Şehrin IATA kodu Gemini'ye güvenilmeden Travelpayouts autocomplete'ten doğrulanır (`term=city`, aynı ülke).
2. **Paralel çağrılar** (`asyncio.gather(..., return_exceptions=True)`):
   - `travelpayouts.flights(origin, dest, departDate, returnDate)`: `GET /aviasales/v3/prices_for_dates`, `currency=usd`, `sorting=price`, `limit=30`. Sonuç boş dönerse aynı istek ay bazında (`YYYY-MM`) tekrarlanır.
   - `liteapi.rates(cityName, countryCode, checkin, checkout, travelers, guestNationality=home.countryCode)`: `POST /v3.0/hotels/rates`, `currency=USD`, `margin=5`, `limit=30`, `maxRatesPerHotel=1`.
   - `gemini.find_places(city, country, profile)`: Maps grounding açık, Gemini 3 Flash. Çıktı serbest metin ve kaynaklar. Metin şunları içerir: profile uygun aktiviteler, diyete uygun yemek mekânları, kişi başı günlük yemek+aktivite harcaması (yerel para biriminde).
   - `currency.rates()`: `GET https://open.er-api.com/v6/latest/USD`
3. **Metni JSON'a çevirme:** `gemini.structure_places(text, diet)` structured output döner (araç kullanılmaz): `{ activities[5], food[5], dailySpendLocalPerPerson }`. Maps grounding ile structured output aynı çağrıda birleştirilemediği için bu ayrı bir çağrı.
4. **Bütçe hesabı:** `budget.py`, bkz. §9.
5. **Para birimi:** Her USD tutarı `{ home, local }` biçimine çevrilir. Günlük harcama önce yerel birimden USD'ye çevrilir.

Gemini SDK çağrıları senkron olduğu için `asyncio.to_thread` ile paralel çalıştırılır.

### 8.2 `/suggest`
1. `travelpayouts.cheapest_from(origin, dates)`: `prices_for_dates` endpoint'i destination olmadan çağrılır. Bu çalışmazsa `v2/prices/latest?origin=` kullanılır. Yaklaşık 30 aday gelir.
2. Ön filtre: `price × travelers ≤ budget`.
3. `gemini.rank_suggestions(candidates, profile)` structured output döner: `[{ iata, reason }] × 3`. Dönen IATA kodları aday listesinde yoksa atılır.
4. Adayların ülke ve para birimi bilgisi Travelpayouts statik verisinden (`cities.json`, `countries.json`) eklenir.

### 8.3 Affiliate URL
`url = "https://www.aviasales.com" + link + "&marker=" + TRAVELPAYOUTS_MARKER`
> Bu format ilk 45 dakikada doğrulanacak (§12). Travelpayouts kendi link üreticisini zorunlu tutuyorsa sadece `travelpayouts.py` değişir.

## 9. Bütçe kuralları (`budget.py`)

Tüm hesaplar USD üzerinden yapılır.

```
days            = (returnDate - departDate).days
dailyTotal      = dailySpendPerPerson × days × travelers
remaining       = budget - dailyTotal
flightTotal(f)  = f.price × travelers
stayTotal(h)    = h.price                    # tüm konaklama, 1 oda
minFlight       = min(flightTotal)           # kategori boşsa 0
minStay         = min(stayTotal)             # kategori boşsa 0

f.overBudget    = flightTotal(f) + minStay   > remaining
h.overBudget    = minFlight + stayTotal(h)   > remaining

flights, stays  : fiyata göre artan sıralanır, ilk 5 alınır
flightAndStay   = minFlight + minStay
remainingAfter  = budget - dailyTotal - flightAndStay
fits            = remainingAfter >= 0
```

Bir öğenin bütçeye uyup uymadığı fiyatla tek yönlü değiştiği için, artan fiyat sıralaması "Over budget" öğelerini otomatik olarak listenin en altına yerleştirir. Ayrıca bir sıralama yapmaya gerek yok.

## 10. Para birimi (`currency.py`)
- USD bazlı kurlar bellekte 1 saat tutulur.
- `to_money(usd, home, local) → { home: usd × rates[home], local: usd × rates[local] }`
- Bir birim kurlar listesinde yoksa o alan USD olarak döner ve loglanır.
- Yuvarlama ve biçimlendirme mobilde `Intl.NumberFormat` ile yapılır.

## 11. Gelir modeli
- **Otel:** LiteAPI `margin=5`. Kazanç yanıtta ayrı bir alan olarak geliyorsa o kullanılır. Gelmiyorsa `price × 5 / 105` ile hesaplanır.
- **Uçuş:** Travelpayouts affiliate marker'ı. Satış olursa komisyon gelir.
- **Demo:** `DEMO_MODE = true` (mobil sabiti) iken komisyon ve affiliate etiketleri görünür.

## 12. Hata yönetimi, önbellek, güvenlik
- **Timeout:** Travelpayouts, LiteAPI ve döviz çağrılarında 15 sn, Gemini çağrılarında 40 sn.
- **Kısmi hata:** `gather` sonucunda exception dönen kategori için `errors.<kategori>` alanına mesaj yazılır, yanıt yine 200 döner. Şehir seçimi başarısız olursa `/plan` 502 döner.
- **Önbellek:** `(endpoint, json.dumps(body, sort_keys=True))` anahtarlı bir dict. Aynı demo isteği anında döner ve kota korunur.
  `# ponytail: süreç içi dict; birden fazla instance veya uzun süreli kullanımda Redis/Memorystore`
- **Güvenlik:** Anahtarlar sadece sunucuda. Backend herkese açık (`--allow-unauthenticated`) ve rate limit yok.
  `# ponytail: hackathon demosu için kabul edilebilir; yayına çıkmadan önce rate limit + auth`

## 13. Deploy
- **Backend:**
  `gcloud run deploy google-trip-api --source backend --region us-central1 --allow-unauthenticated --min-instances 1 --set-env-vars ...`
- **Mobil:** Telefonda Expo Go ile çalışır. `BASE_URL` Cloud Run adresine ayarlanır.

## 14. Test
- **`backend/test_budget.py`** (assert tabanlı), şunları kontrol eder:
  - bütçe sınırındaki bir öğe doğru işaretleniyor mu,
  - `remaining` hesabı doğru mu,
  - boş kategoride min değer 0 alınıyor mu,
  - sıralamadan sonra "Over budget" öğeleri en altta mı kalıyor.
- **Smoke test:** Deploy edilen URL'ye örnek bir `/plan` ve `/suggest` isteği atılır (curl).
- **Mobil:** Expo Go'da uçtan uca akış çalıştırılır: Profile → Trip → Suggest → Results.

## 15. İlk 45 dakikada doğrulanacak riskler

Bu işler birbirinden bağımsız, paralel yapılabilir:

1. **Travelpayouts:**
   - Kayıt olunacak, token ve marker alınacak.
   - `prices_for_dates` gerçek bir rota için veri dönüyor mu bakılacak.
   - Destination parametresi olmadan çalışıyor mu bakılacak.
   - Affiliate link formatı doğrulanacak.
   - **Aviasales programının mobil uygulama trafiğine izin verip vermediği** kontrol edilecek.
2. **LiteAPI:**
   - Sandbox anahtarı alınacak.
   - `cityName` ile fiyat geliyor mu bakılacak.
   - Otel adı ve yıldız bilgisinin yanıtta nerede olduğu bulunacak.
   - Komisyon ayrı bir alan olarak geliyor mu bakılacak.
3. **Gemini:**
   - AI Studio anahtarı alınacak.
   - Interactions API ile Maps grounding çalışıyor mu bakılacak.
   - Kaynakların yanıtta nerede olduğu bulunacak.
   - Structured output çağrısı test edilecek.
4. **Cloud Run:** GCP projesi ve faturalandırma açılacak, hello-world FastAPI deploy edilecek.
5. **Expo:** Proje oluşturulacak, Expo Go'da 4 ekran arasında geçiş yapılabilecek, `Wolfy` bileşeni hazırlanacak.
6. ~~**Wolfy görseli:** Damalı arka plan temizlenecek.~~ **Tamamlandı:** `mobile/assets/wolfy.png`, 601×703, şeffaf PNG (macOS Vision ile ayrıldı).

## 16. Bilinen sınırlar
- Uçuş fiyatları önbellekten gelir, anlık değildir. Ekranda "last seen" notu gösterilir.
- Tüm yolcular tek odada kalır.
- Günlük harcama Gemini tahminidir, `≈` işaretiyle gösterilir.
- Profil kalıcı değildir, uygulama her açılışta sıfırlanır.
- Maps grounding sadece İngilizce çalışır.
- Otel rezervasyonu yapılmaz, sadece liste gösterilir.

## 17. Açık kalan işler
- Wolfy animasyonu sonraki aşamada yapılacak.
- İş bölümü bu spec onaylandıktan sonra yapılacak.
