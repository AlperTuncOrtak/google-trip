import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import Button from "../components/Button";
import { OptionRow, Section } from "../components/Form";
import Hero from "../components/Hero";
import Wolfy from "../components/Wolfy";
import { Country, flag, getCountries, money } from "../lib/api";
import { iso, useStore } from "../lib/store";
import { colors, fonts, ui } from "../lib/theme";

function DateField({ label, value, min, onChange }: { label: string; value: string; min: Date; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const date = new Date(`${value}T12:00:00`);
  const pick = (_: DateTimePickerEvent, d?: Date) => {
    setOpen(false);
    if (d) onChange(iso(d));
  };
  const pretty = date.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" });
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={ui.hint}>{label}</Text>
      {Platform.OS === "ios" ? (
        <DateTimePicker value={date} mode="date" display="compact" minimumDate={min} onChange={pick} style={{ alignSelf: "flex-start" }} />
      ) : (
        <>
          <Pressable style={[ui.input, { paddingVertical: 12 }]} onPress={() => setOpen(true)} accessibilityRole="button">
            <Text style={[ui.body, { fontFamily: fonts.bodyBold }]}>📅 {pretty}</Text>
          </Pressable>
          {open && <DateTimePicker value={date} mode="date" minimumDate={min} onChange={pick} />}
        </>
      )}
    </View>
  );
}

function Segmented<T extends string>({ options, value, onChange }: { options: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: "row", backgroundColor: colors.surface, borderRadius: 999, padding: 4 }}>
      {options.map(([v, label]) => {
        const on = v === value;
        return (
          <Pressable key={v} onPress={() => onChange(v)} accessibilityRole="button" accessibilityState={{ selected: on }}
            style={{ flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: "center", backgroundColor: on ? colors.bg : "transparent" }}>
            <Text style={{ fontFamily: on ? fonts.bodyBold : fonts.bodyMedium, fontSize: 14, color: on ? colors.blue : colors.sub }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Stepper({ sign, label, disabled, onPress }: { sign: string; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" disabled={disabled} onPress={onPress}
      style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.blueSoft, opacity: disabled ? 0.4 : 1 }}>
      <Text style={{ fontFamily: fonts.displayBold, fontSize: 20, color: colors.blue }}>{sign}</Text>
    </Pressable>
  );
}

export default function TripScreen() {
  const { profile, trip, setTrip, setDestination } = useStore();
  const [budgetText, setBudgetText] = useState(trip.budget ? String(trip.budget) : "");
  const [mode, setMode] = useState<"total" | "person">("total");
  const [countries, setCountries] = useState<Country[]>([]);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState<Country | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    getCountries().then(setCountries).catch(() => setLoadError("Couldn't load countries. Check your connection."));
  }, []);

  const currency = profile.homeCity?.currency ?? "USD";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const today = iso(new Date());

  const amount = Number(budgetText.replace(/[^0-9.,]/g, "").replace(",", "."));
  const total = mode === "person" ? amount * trip.travelers : amount;
  const problem =
    !(amount > 0) ? "Enter a budget." :
    trip.departDate <= today ? "Departure must be after today." :
    trip.returnDate <= trip.departDate ? "Return must be after departure." :
    "";

  const q = query.trim().toLowerCase();
  const matches = q.length === 0 ? [] : countries
    .filter((c) => c.name.toLowerCase().includes(q))
    .sort((a, b) => Number(!a.name.toLowerCase().startsWith(q)) - Number(!b.name.toLowerCase().startsWith(q)))
    .slice(0, 6);

  const nights = Math.max(0, Math.round((new Date(trip.returnDate).getTime() - new Date(trip.departDate).getTime()) / 864e5));

  const go = (path: "/results" | "/suggestions") => {
    setTrip({ ...trip, budget: total });
    setDestination(path === "/results" && country ? { countryCode: country.code } : null);
    router.push(path);
  };

  return (
    <ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
      <Hero eyebrow="STEP 2 OF 2" title="Plan your trip" subtitle="Don't know where yet? No problem. Tell your budget — we'll handle the rest." pose="think" />

      <View style={ui.sheet}>
        <Animated.View entering={FadeInDown.springify()} style={[ui.card, { gap: 14, marginTop: -8 }]}>
          <Text style={ui.label}>{mode === "total" ? "Total trip budget (all-in)" : "Budget per person"} 👇</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TextInput
              style={{ flex: 1, minWidth: 0, width: "100%", fontFamily: fonts.displayBold, fontSize: 44, color: colors.ink, paddingVertical: 0 }}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.line}
              value={budgetText}
              onChangeText={setBudgetText}
              accessibilityLabel="Budget amount"
            />
            <View style={[ui.pill, { backgroundColor: colors.blueSoft, paddingHorizontal: 14, paddingVertical: 8 }]}>
              <Text style={[ui.pillText, { color: colors.blue, fontSize: 15 }]}>{currency}</Text>
            </View>
          </View>
          <Segmented options={[["total", "Total"], ["person", "Per person"]]} value={mode} onChange={setMode} />
          <Text style={ui.hint}>
            ✈️ 🏨 🍽️ Flights, stays, food & activities included
            {mode === "person" && amount > 0 ? ` · ${money(total, currency)} total for ${trip.travelers}` : ""}
          </Text>
        </Animated.View>

        <Section title="When & who" hint={nights > 0 ? `${nights} nights` : undefined} index={1}>
          <View style={[ui.card, { gap: 16 }]}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <DateField label="Departure" value={trip.departDate} min={tomorrow} onChange={(v) => setTrip({ ...trip, departDate: v })} />
              <DateField label="Return" value={trip.returnDate} min={tomorrow} onChange={(v) => setTrip({ ...trip, returnDate: v })} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={[ui.body, { fontFamily: fonts.bodyBold }]}>👥 Travelers</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                <Stepper sign="−" label="Fewer travelers" disabled={trip.travelers <= 1}
                  onPress={() => setTrip({ ...trip, travelers: trip.travelers - 1 })} />
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 22, color: colors.ink, minWidth: 20, textAlign: "center" }}>{trip.travelers}</Text>
                <Stepper sign="+" label="More travelers" disabled={trip.travelers >= 9}
                  onPress={() => setTrip({ ...trip, travelers: trip.travelers + 1 })} />
              </View>
            </View>
          </View>
        </Section>

        <Section title="Where to?" hint="optional" index={2}>
          {country ? (
            <OptionRow label={`${flag(country.code)}  ${country.name} · ${country.currency}`} icon="✕" onPress={() => setCountry(null)} />
          ) : (
            <TextInput
              style={ui.input}
              placeholder="🌍  Search a country"
              placeholderTextColor={colors.sub}
              value={query}
              onChangeText={setQuery}
            />
          )}
          {!country && matches.map((c) => (
            <OptionRow key={c.code} label={`${flag(c.code)}  ${c.name} · ${c.currency}`} onPress={() => { setCountry(c); setQuery(""); }} />
          ))}
          {!!loadError && <Text style={[ui.error, { marginTop: 8 }]}>{loadError}</Text>}
        </Section>

        <Animated.View entering={FadeInDown.delay(260).springify()} style={{ gap: 12 }}>
          <Wolfy pose="think" message="What's your budget? I'll make it stretch." />
          {!!problem && budgetText.length > 0 && <Text style={[ui.error, { textAlign: "center" }]}>{problem}</Text>}
          <Button title="Plan my trip" disabled={!!problem || !country} onPress={() => go("/results")} />
          <Button title="Suggest for me ✨" variant="outline" disabled={!!problem} onPress={() => go("/suggestions")} />
          {!problem && !country && (
            <Text style={[ui.hint, { textAlign: "center" }]}>Pick a country to plan, or let Wolfy suggest one.</Text>
          )}
        </Animated.View>
      </View>
    </ScrollView>
  );
}
