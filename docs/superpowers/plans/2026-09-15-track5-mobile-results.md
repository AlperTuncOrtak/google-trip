# Track 5: Mobil Suggestions ve Results

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "Suggest for me" sonuç kartları ve plan sonuç ekranı: bütçe çubuğu, 4 sekme, Over budget etiketleri, demo mode etiketleri, Google Maps kaynakları, yükleme ve hata durumları.

**Architecture:** `useRequest` hook'u yükleme, hata ve tekrar deneme durumlarını yönetir. `WolfyStatus` bu durumları Wolfy ile gösterir. Kart bileşenleri `ResultCards.tsx` içinde tutulur. Ekranlar veriyi Track 4'ün store'undan alır.

**Tech Stack:** Expo Router, TypeScript, React Native `Linking`

**Spec:** `docs/superpowers/specs/2026-09-15-google-trip-design.md`
**Ana plan:** `docs/superpowers/plans/2026-09-15-google-trip.md` (Global Constraints ve sözleşme geçerli)

**Ön koşul:** Track 4 Task 1 push edildi (`api.ts`, `store.tsx`, `theme.ts`, `Chip.tsx`, yer tutucu ekranlar). `git pull` yap. Track 4 Task 2 (`Wolfy.tsx`) henüz gelmediyse kodu Track 4 planından alıp önce o dosyayı ekle, Kişi 4'e haber ver.

**Doğrulama yöntemi:** `npx tsc --noEmit` ve backend fixture modundayken Expo Go'da elle kontrol.

---

### Task 1: `useRequest`, `WolfyStatus`, Suggestions ekranı

**Files:**
- Create: `mobile/lib/useRequest.ts`, `mobile/components/WolfyStatus.tsx`
- Modify: `mobile/app/suggestions.tsx` (dosyanın tamamı değişir)

**Interfaces:**
- Consumes: `postSuggest`, `bothMoney` (api.ts); `useStore` (store.tsx); `Wolfy`; `ui`
- Produces:
  - `useRequest<T>(fn: () => Promise<T>) -> { data: T | null; error: boolean; retry: () => void }`
  - `<WolfyStatus message: string loading?: boolean onRetry?: () => void />`
  - Karta dokununca `setDestination({ countryCode, city: { name, iata, reason } })` yapılır ve `/results` açılır.

- [ ] **Step 1: `mobile/lib/useRequest.ts`**

```ts
import { useEffect, useState } from "react";

export function useRequest<T>(fn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError(false);
    fn()
      .then((d) => alive && setData(d))
      .catch((e) => {
        console.warn(e);
        if (alive) setError(true);
      });
    return () => { alive = false; };
  }, [attempt]);

  return { data, error, retry: () => setAttempt((n) => n + 1) };
}
```

- [ ] **Step 2: `mobile/components/WolfyStatus.tsx`**

```tsx
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { colors, ui } from "../lib/theme";
import Wolfy from "./Wolfy";

export default function WolfyStatus({ message, loading, onRetry }: { message: string; loading?: boolean; onRetry?: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: 24, gap: 20 }}>
      <Wolfy size="large" message={message} />
      {loading && <ActivityIndicator size="large" color={colors.blue} />}
      {onRetry && (
        <Pressable style={[ui.button, { paddingHorizontal: 32 }]} onPress={onRetry} accessibilityRole="button">
          <Text style={ui.buttonText}>Try again</Text>
        </Pressable>
      )}
    </View>
  );
}
```

- [ ] **Step 3: `mobile/app/suggestions.tsx`**

```tsx
import { router } from "expo-router";
import { Pressable, ScrollView, Text } from "react-native";
import Wolfy from "../components/Wolfy";
import WolfyStatus from "../components/WolfyStatus";
import { bothMoney, postSuggest } from "../lib/api";
import { useStore } from "../lib/store";
import { ui } from "../lib/theme";
import { useRequest } from "../lib/useRequest";

export default function SuggestionsScreen() {
  const { profile, trip, setDestination } = useStore();
  const { data, error, retry } = useRequest(() => postSuggest(profile, trip));

  if (error) return <WolfyStatus message="Oops, I lost the scent. Try again?" onRetry={retry} />;
  if (!data) return <WolfyStatus loading message="Sniffing out the best deals…" />;
  if (data.suggestions.length === 0) {
    return <WolfyStatus message="Nothing fits this budget yet. Try a bigger budget or other dates." />;
  }

  const home = profile.homeCity?.currency ?? "USD";
  const n = data.suggestions.length;

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <Wolfy message={`I found ${n} place${n > 1 ? "s" : ""} you'll love!`} />
      {data.suggestions.map((s) => (
        <Pressable
          key={s.iata}
          style={ui.card}
          accessibilityRole="button"
          onPress={() => {
            setDestination({ countryCode: s.countryCode, city: { name: s.city, iata: s.iata, reason: s.reason } });
            router.push("/results");
          }}
        >
          <Text style={ui.h1}>{s.countryName} → {s.city}</Text>
          <Text>{s.reason}</Text>
          <Text style={{ fontWeight: "700", marginTop: 6 }}>Flights from {bothMoney(s.flightPrice, home, s.localCurrency)}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
```

- [ ] **Step 4: Doğrula**

Run: `npx tsc --noEmit`
Expected: hata yok.

Expo Go'da Profile → Trip → "Suggest for me":
1. Kısa bir süre büyük Wolfy ve "Sniffing out the best deals…" görünür.
2. Ardından 3 kart gelir: "Japan → Osaka", "Spain → Barcelona", "Turkey → Istanbul". Fiyatlar "PLN ≈ yerel para birimi" biçiminde.
3. Backend'i durdurup "Suggest for me"ye tekrar bas. "Oops, I lost the scent" ve "Try again" görünür. Backend'i başlatıp "Try again"e basınca kartlar gelir.
4. Bir karta dokununca Results yer tutucusu açılır.

- [ ] **Step 5: Commit**

```bash
git add lib/useRequest.ts components/WolfyStatus.tsx app/suggestions.tsx && git commit -m "feat(mobile): suggestions screen with loading/error states" && git pull --rebase && git push
```

---

### Task 2: Sonuç kartları (`ResultCards.tsx`)

**Files:**
- Create: `mobile/components/ResultCards.tsx`

**Interfaces:**
- Consumes: `Flight`, `Stay`, `Place`, `bothMoney`, `money`, `DEMO_MODE` (api.ts); `ui`, `colors`
- Produces: `type Cur = { home: string; local: string }`, `<FlightCard f cur />`, `<StayCard s cur />`, `<PlaceCard p />`, `<Sources sources />`, `ago(isoTime) -> string`

- [ ] **Step 1: `mobile/components/ResultCards.tsx`**

```tsx
import { Linking, Pressable, Text, View } from "react-native";
import { bothMoney, DEMO_MODE, Flight, money, Place, Stay } from "../lib/api";
import { colors, ui } from "../lib/theme";

export type Cur = { home: string; local: string };

export function ago(isoTime: string) {
  if (!isoTime) return "Cached price";
  const hours = Math.round((Date.now() - new Date(isoTime).getTime()) / 36e5);
  if (hours < 1) return "Price seen just now";
  return hours < 48 ? `Price seen ${hours}h ago` : `Price seen ${Math.round(hours / 24)}d ago`;
}

const when = (s: string) => (s ? s.slice(0, 16).replace("T", " ") : "—");

function OverBudget() {
  return <Text style={{ color: colors.red, fontWeight: "700", fontSize: 12 }}>Over budget</Text>;
}

function Head({ title, over }: { title: string; over: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
      <Text style={{ fontWeight: "700", flexShrink: 1 }}>{title}</Text>
      {over && <OverBudget />}
    </View>
  );
}

export function FlightCard({ f, cur }: { f: Flight; cur: Cur }) {
  const stops = f.transfers === 0 ? "Direct" : `${f.transfers} stop${f.transfers > 1 ? "s" : ""}`;
  return (
    <Pressable style={[ui.card, f.overBudget && { opacity: 0.6 }]} onPress={() => Linking.openURL(f.url)} accessibilityRole="link">
      <Head title={`${f.airline} · ${stops}`} over={f.overBudget} />
      <Text style={ui.muted}>Out {when(f.departAt)} · Back {when(f.returnAt)}</Text>
      <Text style={{ fontSize: 16, fontWeight: "700" }}>{bothMoney(f.price, cur.home, cur.local)}</Text>
      <Text style={ui.muted}>{ago(f.seenAt)}{DEMO_MODE ? " · Affiliate link" : ""}</Text>
    </Pressable>
  );
}

export function StayCard({ s, cur }: { s: Stay; cur: Cur }) {
  return (
    <View style={[ui.card, s.overBudget && { opacity: 0.6 }]}>
      <Head title={s.name} over={s.overBudget} />
      {s.stars > 0 && <Text style={{ color: colors.yellow }}>{"★".repeat(Math.round(s.stars))}</Text>}
      <Text style={{ fontSize: 16, fontWeight: "700" }}>{bothMoney(s.price, cur.home, cur.local)}</Text>
      {DEMO_MODE && <Text style={{ color: colors.green, fontWeight: "600" }}>We earn ≈ {money(s.commission.home, cur.home)}</Text>}
    </View>
  );
}

export function PlaceCard({ p }: { p: Place }) {
  return (
    <View style={ui.card}>
      <Text style={{ fontWeight: "700" }}>{p.name}</Text>
      <Text style={ui.muted}>{p.description}</Text>
    </View>
  );
}

export function Sources({ sources }: { sources: { title: string; uri: string }[] }) {
  if (sources.length === 0) return null;
  return (
    <View style={{ gap: 4 }}>
      <Text style={ui.muted}>Sources from Google Maps</Text>
      {sources.map((s) => (
        <Text key={s.uri} style={{ color: colors.blue }} onPress={() => Linking.openURL(s.uri)} accessibilityRole="link">
          {s.title}
        </Text>
      ))}
    </View>
  );
}
```

- [ ] **Step 2: Doğrula**

Run: `npx tsc --noEmit`
Expected: hata yok. Görsel kontrol Task 3'te yapılır.

- [ ] **Step 3: Commit**

```bash
git add components/ResultCards.tsx && git commit -m "feat(mobile): flight, stay, place cards and Maps sources" && git pull --rebase && git push
```

---

### Task 3: Results ekranı

**Files:**
- Modify: `mobile/app/results.tsx` (dosyanın tamamı değişir)

**Interfaces:**
- Consumes: `postPlan`, `bothMoney`, `Money`, `Plan` (api.ts); `useStore`; `useRequest`; `WolfyStatus`, `Wolfy`, `Chip`; `FlightCard`, `StayCard`, `PlaceCard`, `Sources`, `Cur` (ResultCards)

- [ ] **Step 1: `mobile/app/results.tsx`**

```tsx
import { ReactNode, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import Chip from "../components/Chip";
import { FlightCard, PlaceCard, Sources, StayCard } from "../components/ResultCards";
import Wolfy from "../components/Wolfy";
import WolfyStatus from "../components/WolfyStatus";
import { bothMoney, Money, Plan, postPlan } from "../lib/api";
import { useStore } from "../lib/store";
import { colors, ui } from "../lib/theme";
import { useRequest } from "../lib/useRequest";

const TABS = ["Flights", "Stays", "Activities", "Food"] as const;
type Tab = (typeof TABS)[number];

export default function ResultsScreen() {
  const { profile, trip, destination } = useStore();
  const [tab, setTab] = useState<Tab>("Flights");
  const { data, error, retry } = useRequest(() => postPlan(profile, trip, destination ?? { countryCode: "" }));

  if (!destination) return <WolfyStatus message="Pick a country first!" />;
  if (error) return <WolfyStatus message="Oops, I lost the scent. Try again?" onRetry={retry} />;
  if (!data) return <WolfyStatus loading message="Sniffing out the best deals…" />;

  const cur = data.currencies;
  const b = data.budget;

  const Line = ({ label, m, color, approx }: { label: string; m: Money; color?: string; approx?: boolean }) => (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
      <Text style={ui.muted}>{label}</Text>
      <Text style={{ fontWeight: "700", color: color ?? colors.text, flexShrink: 1, textAlign: "right" }}>
        {approx ? "≈ " : ""}{bothMoney(m, cur.home, cur.local)}
      </Text>
    </View>
  );

  const section = (key: keyof Plan["errors"], count: number, render: () => ReactNode) =>
    data.errors[key] ? <Text style={ui.error}>Unavailable right now</Text>
      : count === 0 ? <Text style={ui.muted}>No results found.</Text>
      : render();

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <Wolfy message={b.fits ? "All of this fits your budget!" : "It's a bit over budget — here are the cheapest options."} />

      <View>
        <Text style={ui.h1}>{data.destination.city}, {data.destination.countryName}</Text>
        {!!data.destination.reason && <Text style={ui.muted}>{data.destination.reason}</Text>}
      </View>

      <View style={ui.card}>
        <Line label="Budget" m={b.total} />
        <Line label="Cheapest flight + stay" m={b.flightAndStay} />
        <Line label={`Daily spend × ${b.days} days`} m={b.dailySpendTotal} approx />
        <Line label="Remaining" m={b.remaining} color={b.fits ? colors.green : colors.red} />
      </View>

      <View style={ui.row}>
        {TABS.map((t) => <Chip key={t} label={t} selected={tab === t} onPress={() => setTab(t)} />)}
      </View>

      {tab === "Flights" && section("flights", data.flights.length, () =>
        data.flights.map((f, i) => <FlightCard key={i} f={f} cur={cur} />))}

      {tab === "Stays" && section("stays", data.stays.length, () =>
        data.stays.map((s, i) => <StayCard key={i} s={s} cur={cur} />))}

      {tab === "Activities" && section("places", data.activities.length, () => (
        <>
          {data.activities.map((p, i) => <PlaceCard key={i} p={p} />)}
          <Sources sources={data.sources} />
        </>
      ))}

      {tab === "Food" && section("places", data.food.length, () => (
        <>
          {data.food.map((p, i) => <PlaceCard key={i} p={p} />)}
          <Sources sources={data.sources} />
        </>
      ))}
    </ScrollView>
  );
}
```

- [ ] **Step 2: Doğrula**

Run: `npx tsc --noEmit`
Expected: hata yok.

Expo Go'da (backend fixture modunda):
1. Trip ekranında Japan seç ve "Plan my trip"e bas. Önce yükleme Wolfy'si, sonra "Osaka, Japan" ve gerekçe görünür.
2. Bütçe kartı: Remaining yeşil, tutarlar "zł … ≈ ¥ …" biçiminde.
3. Flights: 3 kart, sonuncuda kırmızı "Over budget" etiketi ve soluk görünüm. Karta dokununca tarayıcı açılır. Altında "Affiliate link" yazar.
4. Stays: 3 kart, yıldızlar ve yeşil "We earn ≈ …". Sonuncu Over budget.
5. Activities ve Food: kartlar ve altında "Sources from Google Maps" linki.
6. `backend/fixtures/plan_response.json` içinde geçici olarak `"errors"` alanındaki `"stays": null` değerini `"stays": "timeout"` yap. Stays sekmesinde "Unavailable right now" yazmalı, diğer sekmeler çalışmalı. Sonra fixture'ı geri al.
7. Suggestions'tan bir karta dokunarak gelince de ekran açılmalı.

- [ ] **Step 3: Commit**

```bash
git add app/results.tsx && git commit -m "feat(mobile): results screen with budget bar, tabs, over-budget and demo labels" && git pull --rebase && git push
```
