# Track 4: Mobil İskelet, Wolfy, Profile, Trip

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expo Router projesi, backend tipleri ve istemcisi, bellekte tutulan store, ortak tema, Wolfy bileşeni, Profile ve Trip ekranları.

**Architecture:** `mobile/lib/api.ts` backend sözleşmesinin TypeScript karşılığıdır. `mobile/lib/store.tsx` React context ile profil, trip ve seçilen destinasyonu tutar (kalıcı değil). Ekranlar `expo-router` ile dosya bazlıdır.

**Tech Stack:** Expo (create-expo-app@latest), Expo Router, TypeScript, @react-native-community/datetimepicker

**Spec:** `docs/superpowers/specs/2026-09-15-google-trip-design.md`
**Ana plan:** `docs/superpowers/plans/2026-09-15-google-trip.md` (Global Constraints ve sözleşme geçerli)

**Doğrulama yöntemi:** Mobil tarafta test framework'ü yok (spec §14). Her görevin sonunda `npx tsc --noEmit` çalıştırılır ve ekran telefonda Expo Go ile elle kontrol edilir.

---

### Task 1: Expo iskeleti, tipler, store, tema (T0 – 0:20, önce bitir ve push et)

**Files:**
- Create: `mobile/` (create-expo-app)
- Create: `mobile/lib/api.ts`, `mobile/lib/store.tsx`, `mobile/lib/theme.ts`, `mobile/components/Chip.tsx`
- Create: `mobile/app/_layout.tsx`, `mobile/app/index.tsx`, `mobile/app/trip.tsx`, `mobile/app/suggestions.tsx`, `mobile/app/results.tsx` (son dördü yer tutucu)

**Interfaces:**
- Produces (Track 5 bunları kullanır):
  - `api.ts`: `BASE_URL`, `DEMO_MODE`, tipler `Diet, City, Country, Profile, Trip, Money, Suggestion, Flight, Stay, Place, Plan, Destination`, fonksiyonlar `getPlaces(term)`, `getCountries()`, `postSuggest(profile, trip)`, `postPlan(profile, trip, destination)`, `money(value, currency)`, `bothMoney(m, home, local)`
  - `store.tsx`: `StoreProvider`, `useStore() -> { profile, setProfile, trip, setTrip, destination, setDestination }`, `iso(date) -> "YYYY-MM-DD"`
  - `theme.ts`: `colors`, `ui` (StyleSheet)
  - `Chip.tsx`: `<Chip label selected onPress />`

- [ ] **Step 1: Projeyi oluştur** (`mobile/assets/wolfy.png` zaten var, korunur)

```bash
cd "<repo kökü>"
npx create-expo-app@latest mobile-tmp
rsync -a mobile-tmp/ mobile/ && rm -rf mobile-tmp
cd mobile
rm -rf app components hooks constants
npx expo install @react-native-community/datetimepicker
mkdir -p app lib components
```

`mobile/app.json` içinde `"name"` alanını `"Google Trip"` yap.

- [ ] **Step 2: `mobile/lib/api.ts`**

```ts
export const BASE_URL = "http://192.168.1.10:8000"; // Kişi 1'in verdiği adres; entegrasyonda Cloud Run URL'si
export const DEMO_MODE = true;

export type Diet = "none" | "vegetarian" | "vegan" | "halal" | "gluten_free";
export type City = { name: string; iata: string; countryCode: string; countryName: string; currency: string };
export type Country = { code: string; name: string; currency: string };
export type Profile = { homeCity: City | null; activities: string[]; activitiesNote: string; diet: Diet };
export type Trip = { budget: number; departDate: string; returnDate: string; travelers: number };
export type Money = { home: number; local: number };

export type Suggestion = {
  countryCode: string; countryName: string; city: string; iata: string;
  localCurrency: string; reason: string; flightPrice: Money;
};
export type Flight = {
  airline: string; departAt: string; returnAt: string; transfers: number;
  price: Money; url: string; seenAt: string; overBudget: boolean;
};
export type Stay = { name: string; stars: number; price: Money; commission: Money; overBudget: boolean };
export type Place = { name: string; description: string };
export type Plan = {
  destination: { city: string; iata: string; countryCode: string; countryName: string; reason: string };
  currencies: { home: string; local: string };
  budget: {
    total: Money; flightAndStay: Money; dailySpendPerPerson: Money; days: number;
    dailySpendTotal: Money; remaining: Money; fits: boolean;
  };
  flights: Flight[];
  stays: Stay[];
  activities: Place[];
  food: Place[];
  sources: { title: string; uri: string }[];
  errors: { flights: string | null; stays: string | null; places: string | null };
};
export type Destination = { countryCode: string; city?: { name: string; iata: string; reason: string } };

async function call<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(BASE_URL + path, body === undefined ? undefined : {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

export const getPlaces = (term: string) => call<City[]>(`/places?term=${encodeURIComponent(term)}`);
export const getCountries = () => call<Country[]>("/countries");
export const postSuggest = (profile: Profile, trip: Trip) =>
  call<{ suggestions: Suggestion[] }>("/suggest", { profile, trip });
export const postPlan = (profile: Profile, trip: Trip, destination: Destination) =>
  call<Plan>("/plan", { profile, trip, ...destination });

export function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${Math.round(value).toLocaleString("en-US")} ${currency}`;
  }
}

export const bothMoney = (m: Money, home: string, local: string) =>
  home === local ? money(m.home, home) : `${money(m.home, home)} ≈ ${money(m.local, local)}`;
```

- [ ] **Step 3: `mobile/lib/store.tsx`**

```tsx
import { createContext, ReactNode, useContext, useState } from "react";
import { Destination, Profile, Trip } from "./api";

export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

type Store = {
  profile: Profile; setProfile: (p: Profile) => void;
  trip: Trip; setTrip: (t: Trip) => void;
  destination: Destination | null; setDestination: (d: Destination | null) => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>({ homeCity: null, activities: [], activitiesNote: "", diet: "none" });
  const [trip, setTrip] = useState<Trip>({ budget: 0, departDate: iso(inDays(14)), returnDate: iso(inDays(19)), travelers: 1 });
  const [destination, setDestination] = useState<Destination | null>(null);
  return (
    <Ctx.Provider value={{ profile, setProfile, trip, setTrip, destination, setDestination }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}
```

- [ ] **Step 4: `mobile/lib/theme.ts`**

```ts
import { StyleSheet } from "react-native";

export const colors = {
  bg: "#F8FAFD", card: "#FFFFFF", text: "#1F1F1F", muted: "#5F6368", border: "#DADCE0",
  blue: "#1A73E8", red: "#D93025", green: "#188038", yellow: "#F9AB00",
};

export const ui = StyleSheet.create({
  screen: { flexGrow: 1, backgroundColor: colors.bg, padding: 16, gap: 16 },
  h1: { fontSize: 24, fontWeight: "700", color: colors.text },
  label: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 6 },
  muted: { fontSize: 13, color: colors.muted },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text,
  },
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 4 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  button: { backgroundColor: colors.blue, borderRadius: 24, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  buttonDisabled: { opacity: 0.4 },
  error: { color: colors.red, fontSize: 14 },
});
```

- [ ] **Step 5: `mobile/components/Chip.tsx`**

```tsx
import { Pressable, Text } from "react-native";
import { colors } from "../lib/theme";

export default function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
        borderColor: selected ? colors.blue : colors.border,
        backgroundColor: selected ? "#E8F0FE" : colors.card,
      }}
    >
      <Text style={{ color: selected ? colors.blue : colors.text, fontWeight: selected ? "700" : "400" }}>{label}</Text>
    </Pressable>
  );
}
```

- [ ] **Step 6: `mobile/app/_layout.tsx` ve yer tutucu ekranlar**

```tsx
// mobile/app/_layout.tsx
import { Stack } from "expo-router";
import { StoreProvider } from "../lib/store";

export default function Layout() {
  return (
    <StoreProvider>
      <Stack screenOptions={{ headerTitle: "Google Trip" }} />
    </StoreProvider>
  );
}
```

`index.tsx`, `trip.tsx`, `suggestions.tsx` ve `results.tsx` için şimdilik aynı yer tutucu. Her dosyada yalnızca metin farklı:

```tsx
// mobile/app/index.tsx  (trip.tsx → "Trip", suggestions.tsx → "Suggestions", results.tsx → "Results")
import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function Placeholder() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
      <Text>Profile</Text>
      <Link href="/trip">Trip</Link>
      <Link href="/suggestions">Suggestions</Link>
      <Link href="/results">Results</Link>
    </View>
  );
}
```

- [ ] **Step 7: Doğrula**

Run: `npx tsc --noEmit`
Expected: hata yok.

Run: `npx expo start`. Telefonda Expo Go ile QR kodu okut.
Expected: "Profile" ekranı açılır, linklerle 4 ekran arasında geçilebilir.

- [ ] **Step 8: Commit ve push** (Track 5 bundan sonra başlar)

```bash
git add . && git commit -m "feat(mobile): Expo Router skeleton, API types, store, theme" && git pull --rebase && git push
```

---

### Task 2: Wolfy bileşeni

**Files:**
- Create: `mobile/components/Wolfy.tsx`

**Interfaces:**
- Produces: `<Wolfy message: string size?: "small" | "large" />`. `small` iken görsel solda, balon sağda. `large` iken görsel büyük, balon altında. Animasyon sonra yalnızca bu dosyaya eklenecek.

- [ ] **Step 1: `mobile/components/Wolfy.tsx`**

```tsx
import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "../lib/theme";

export default function Wolfy({ message, size = "small" }: { message: string; size?: "small" | "large" }) {
  const large = size === "large";
  return (
    <View style={large ? s.column : s.row} accessibilityLabel={`Wolfy says: ${message}`}>
      <Image source={require("../assets/wolfy.png")} style={large ? s.imgLarge : s.imgSmall} resizeMode="contain" />
      <View style={[s.bubble, large && s.bubbleLarge]}>
        <Text style={[s.text, large && s.textLarge]}>{message}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  column: { alignItems: "center", gap: 12 },
  imgSmall: { width: 64, height: 75 },
  imgLarge: { width: 200, height: 234 },
  bubble: {
    flexShrink: 1, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
    borderRadius: 16, borderBottomLeftRadius: 4, paddingHorizontal: 12, paddingVertical: 10,
  },
  bubbleLarge: { borderBottomLeftRadius: 16, maxWidth: 300 },
  text: { fontSize: 15, color: colors.text },
  textLarge: { fontSize: 17, textAlign: "center" },
});
```

- [ ] **Step 2: Yer tutucu Profile ekranında dene**

`mobile/app/index.tsx` içindeki `<Text>Profile</Text>` satırını geçici olarak şu iki satırla değiştir:

```tsx
<Wolfy message="Hi, I'm Wolfy! Tell me what you love and I'll sniff out your trip." />
<Wolfy size="large" message="Sniffing out the best deals…" />
```

Dosyanın başına şu import'u ekle: `import Wolfy from "../components/Wolfy";`

- [ ] **Step 3: Doğrula**

Run: `npx tsc --noEmit`
Expected: hata yok.

Expo Go'da iki boyutun da taşmadan göründüğünü, arka planın şeffaf olduğunu kontrol et.

- [ ] **Step 4: Commit**

```bash
git add components/Wolfy.tsx app/index.tsx && git commit -m "feat(mobile): Wolfy mascot component" && git pull --rebase && git push
```

---

### Task 3: Profile ekranı

**Files:**
- Modify: `mobile/app/index.tsx` (dosyanın tamamı değişir)

**Interfaces:**
- Consumes: `getPlaces`, `City`, `Diet` (api.ts); `useStore` (store.tsx); `Chip`, `Wolfy`, `ui`, `colors`
- Produces: `profile.homeCity`, `profile.activities`, `profile.activitiesNote`, `profile.diet` store'a yazılır. Continue ile `/trip` ekranına geçilir.

- [ ] **Step 1: `mobile/app/index.tsx`**

```tsx
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Chip from "../components/Chip";
import Wolfy from "../components/Wolfy";
import { City, Diet, getPlaces } from "../lib/api";
import { useStore } from "../lib/store";
import { ui } from "../lib/theme";

const ACTIVITIES = [
  "Nature & Hiking", "Museums & History", "Nightlife", "Beach & Sea",
  "Adventure Sports", "Shopping", "Street Food", "Art & Concerts",
];
const DIETS: [Diet, string][] = [
  ["none", "None"], ["vegetarian", "Vegetarian"], ["vegan", "Vegan"], ["halal", "Halal"], ["gluten_free", "Gluten-free"],
];

export default function ProfileScreen() {
  const { profile, setProfile } = useStore();
  const [term, setTerm] = useState(profile.homeCity?.name ?? "");
  const [results, setResults] = useState<City[]>([]);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    if (term.trim().length < 2 || term === profile.homeCity?.name) {
      setResults([]);
      return;
    }
    const id = setTimeout(() => {
      getPlaces(term.trim())
        .then((r) => { setResults(r); setSearchError(""); })
        .catch(() => setSearchError("Couldn't search cities. Check your connection."));
    }, 300);
    return () => clearTimeout(id);
  }, [term]);

  const pickCity = (c: City) => {
    setProfile({ ...profile, homeCity: c });
    setTerm(c.name);
    setResults([]);
  };

  const toggleActivity = (a: string) =>
    setProfile({
      ...profile,
      activities: profile.activities.includes(a) ? profile.activities.filter((x) => x !== a) : [...profile.activities, a],
    });

  const canContinue = !!profile.homeCity && (profile.activities.length > 0 || profile.activitiesNote.trim().length > 0);

  return (
    <ScrollView contentContainerStyle={ui.screen} keyboardShouldPersistTaps="handled">
      <Wolfy message="Hi, I'm Wolfy! Tell me what you love and I'll sniff out your trip." />

      <View>
        <Text style={ui.label}>Home city</Text>
        <TextInput
          style={ui.input}
          placeholder="e.g. Warsaw"
          value={term}
          onChangeText={(t) => { setTerm(t); if (profile.homeCity) setProfile({ ...profile, homeCity: null }); }}
          autoCorrect={false}
        />
        {results.map((c) => (
          <Pressable key={c.iata + c.countryCode} onPress={() => pickCity(c)} style={{ paddingVertical: 10 }}>
            <Text>{c.name}, {c.countryName} ({c.iata})</Text>
          </Pressable>
        ))}
        {!!searchError && <Text style={ui.error}>{searchError}</Text>}
        {profile.homeCity && <Text style={ui.muted}>Currency: {profile.homeCity.currency}</Text>}
      </View>

      <View>
        <Text style={ui.label}>What do you love doing?</Text>
        <View style={ui.row}>
          {ACTIVITIES.map((a) => (
            <Chip key={a} label={a} selected={profile.activities.includes(a)} onPress={() => toggleActivity(a)} />
          ))}
        </View>
      </View>

      <View>
        <Text style={ui.label}>Anything else?</Text>
        <TextInput
          style={ui.input}
          placeholder="e.g. jazz bars, sunrise hikes"
          value={profile.activitiesNote}
          onChangeText={(t) => setProfile({ ...profile, activitiesNote: t })}
        />
      </View>

      <View>
        <Text style={ui.label}>Diet</Text>
        <View style={ui.row}>
          {DIETS.map(([value, label]) => (
            <Chip key={value} label={label} selected={profile.diet === value} onPress={() => setProfile({ ...profile, diet: value })} />
          ))}
        </View>
      </View>

      <Pressable
        style={[ui.button, !canContinue && ui.buttonDisabled]}
        disabled={!canContinue}
        onPress={() => router.push("/trip")}
        accessibilityRole="button"
      >
        <Text style={ui.buttonText}>Continue</Text>
      </Pressable>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Doğrula**

Run: `npx tsc --noEmit`
Expected: hata yok.

Expo Go'da (backend fixture modunda çalışıyor olmalı):
1. "war" yaz. "Warsaw, Poland (WAW)" çıkar, dokununca "Currency: PLN" yazar.
2. Continue, aktivite seçilmeden pasif. Bir chip seçince aktif olur.
3. Diyet başlangıçta "None" seçili. Başka birine dokununca seçim değişir, aynı anda tek seçim olur.
4. Continue ile Trip yer tutucusu açılır.

- [ ] **Step 3: Commit**

```bash
git add app/index.tsx && git commit -m "feat(mobile): profile screen" && git pull --rebase && git push
```

---

### Task 4: Trip ekranı (ana menü)

**Files:**
- Modify: `mobile/app/trip.tsx` (dosyanın tamamı değişir)

**Interfaces:**
- Consumes: `getCountries`, `Country` (api.ts); `useStore`, `iso` (store.tsx); `Wolfy`, `ui`, `colors`
- Produces: `trip` store'a yazılır. "Plan my trip" ile `setDestination({ countryCode })` yapılır ve `/results` açılır. "Suggest for me" ile `setDestination(null)` yapılır ve `/suggestions` açılır.

- [ ] **Step 1: `mobile/app/trip.tsx`**

```tsx
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Wolfy from "../components/Wolfy";
import { Country, getCountries } from "../lib/api";
import { iso, useStore } from "../lib/store";
import { colors, ui } from "../lib/theme";

function DateField({ label, value, min, onChange }: { label: string; value: string; min: Date; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const date = new Date(`${value}T12:00:00`);
  const pick = (_: DateTimePickerEvent, d?: Date) => {
    setOpen(false);
    if (d) onChange(iso(d));
  };
  return (
    <View style={{ flex: 1 }}>
      <Text style={ui.label}>{label}</Text>
      {Platform.OS === "ios" ? (
        <DateTimePicker value={date} mode="date" display="compact" minimumDate={min} onChange={pick} />
      ) : (
        <>
          <Pressable style={ui.input} onPress={() => setOpen(true)} accessibilityRole="button">
            <Text>{value}</Text>
          </Pressable>
          {open && <DateTimePicker value={date} mode="date" minimumDate={min} onChange={pick} />}
        </>
      )}
    </View>
  );
}

export default function TripScreen() {
  const { profile, trip, setTrip, setDestination } = useStore();
  const [budgetText, setBudgetText] = useState(trip.budget ? String(trip.budget) : "");
  const [countries, setCountries] = useState<Country[]>([]);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState<Country | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    getCountries().then(setCountries).catch(() => setLoadError("Couldn't load countries. Check your connection."));
  }, []);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const today = iso(new Date());

  const budget = Number(budgetText.replace(",", "."));
  const problem =
    !(budget > 0) ? "Enter a budget." :
    trip.departDate <= today ? "Departure must be after today." :
    trip.returnDate <= trip.departDate ? "Return must be after departure." :
    "";

  const matches = query.trim().length === 0 ? [] :
    countries.filter((c) => c.name.toLowerCase().startsWith(query.trim().toLowerCase())).slice(0, 6);

  const go = (path: "/results" | "/suggestions") => {
    setTrip({ ...trip, budget });
    setDestination(path === "/results" && country ? { countryCode: country.code } : null);
    router.push(path);
  };

  return (
    <ScrollView contentContainerStyle={ui.screen} keyboardShouldPersistTaps="handled">
      <Wolfy message="What's your budget? I'll make it stretch." />

      <View>
        <Text style={ui.label}>Budget ({profile.homeCity?.currency})</Text>
        <TextInput style={ui.input} keyboardType="decimal-pad" placeholder="e.g. 9000" value={budgetText} onChangeText={setBudgetText} />
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <DateField label="Departure" value={trip.departDate} min={tomorrow} onChange={(v) => setTrip({ ...trip, departDate: v })} />
        <DateField label="Return" value={trip.returnDate} min={tomorrow} onChange={(v) => setTrip({ ...trip, returnDate: v })} />
      </View>

      <View>
        <Text style={ui.label}>Travelers</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <Pressable style={[ui.input, { paddingHorizontal: 18 }]} disabled={trip.travelers <= 1}
            onPress={() => setTrip({ ...trip, travelers: trip.travelers - 1 })} accessibilityLabel="Fewer travelers">
            <Text style={{ fontSize: 18 }}>−</Text>
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: "700" }}>{trip.travelers}</Text>
          <Pressable style={[ui.input, { paddingHorizontal: 18 }]} disabled={trip.travelers >= 9}
            onPress={() => setTrip({ ...trip, travelers: trip.travelers + 1 })} accessibilityLabel="More travelers">
            <Text style={{ fontSize: 18 }}>+</Text>
          </Pressable>
        </View>
      </View>

      <View>
        <Text style={ui.label}>Where to?</Text>
        <TextInput
          style={ui.input}
          placeholder="Search a country"
          value={country ? country.name : query}
          onChangeText={(t) => { setCountry(null); setQuery(t); }}
        />
        {!country && matches.map((c) => (
          <Pressable key={c.code} onPress={() => { setCountry(c); setQuery(""); }} style={{ paddingVertical: 10 }}>
            <Text>{c.name} ({c.currency})</Text>
          </Pressable>
        ))}
        {!!loadError && <Text style={ui.error}>{loadError}</Text>}
      </View>

      {!!problem && budgetText.length > 0 && <Text style={ui.error}>{problem}</Text>}

      <Pressable style={[ui.button, (!!problem || !country) && ui.buttonDisabled]} disabled={!!problem || !country}
        onPress={() => go("/results")} accessibilityRole="button">
        <Text style={ui.buttonText}>Plan my trip</Text>
      </Pressable>

      <Pressable style={[ui.button, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.blue }, !!problem && ui.buttonDisabled]}
        disabled={!!problem} onPress={() => go("/suggestions")} accessibilityRole="button">
        <Text style={[ui.buttonText, { color: colors.blue }]}>Suggest for me</Text>
      </Pressable>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Doğrula**

Run: `npx tsc --noEmit`
Expected: hata yok.

Expo Go'da:
1. Bütçe boşken iki buton da pasif. Bir sayı girince "Suggest for me" aktif olur.
2. Dönüş tarihini gidişten önceye alınca "Return must be after departure." yazar, butonlar pasifleşir.
3. Yolcu sayısı 1'in altına ve 9'un üstüne çıkmaz.
4. "ja" yazınca "Japan (JPY)" çıkar. Seçince "Plan my trip" aktif olur ve Results yer tutucusunu açar.
5. "Suggest for me", Suggestions yer tutucusunu açar.

- [ ] **Step 3: Commit**

```bash
git add app/trip.tsx && git commit -m "feat(mobile): trip screen with budget, dates, travelers, country" && git pull --rebase && git push
```
