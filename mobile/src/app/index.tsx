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
