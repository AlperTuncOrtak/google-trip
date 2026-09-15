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

  const q = query.trim().toLowerCase();
  const matches = q.length === 0 ? [] : countries
    .filter((c) => c.name.toLowerCase().includes(q))
    .sort((a, b) => Number(!a.name.toLowerCase().startsWith(q)) - Number(!b.name.toLowerCase().startsWith(q)))
    .slice(0, 6);

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
          <Pressable key={c.code} onPress={() => { setCountry(c); setQuery(""); }} accessibilityRole="button"
            style={[ui.card, { flexDirection: "row", justifyContent: "space-between", marginTop: 6 }]}>
            <Text>{c.name} ({c.currency})</Text>
            <Text style={{ color: colors.blue, fontWeight: "700" }}>›</Text>
          </Pressable>
        ))}
        {!!loadError && <Text style={ui.error}>{loadError}</Text>}
      </View>

      {!!problem && budgetText.length > 0 && <Text style={ui.error}>{problem}</Text>}

      <Pressable style={[ui.button, (!!problem || !country) && ui.buttonDisabled]} disabled={!!problem || !country}
        onPress={() => go("/results")} accessibilityRole="button">
        <Text style={ui.buttonText}>Plan my trip</Text>
      </Pressable>
      {!problem && !country && (
        <Text style={[ui.muted, { textAlign: "center" }]}>Pick a country from the list to plan, or let Wolfy suggest one.</Text>
      )}

      <Pressable style={[ui.button, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.blue }, !!problem && ui.buttonDisabled]}
        disabled={!!problem} onPress={() => go("/suggestions")} accessibilityRole="button">
        <Text style={[ui.buttonText, { color: colors.blue }]}>Suggest for me</Text>
      </Pressable>
    </ScrollView>
  );
}
