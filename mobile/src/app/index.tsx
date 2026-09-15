import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import Button from "../components/Button";
import Chip from "../components/Chip";
import { OptionRow, Section } from "../components/Form";
import Hero from "../components/Hero";
import Wolfy from "../components/Wolfy";
import { City, Diet, flag, getPlaces } from "../lib/api";
import { useStore } from "../lib/store";
import { colors, ui } from "../lib/theme";

const ACTIVITIES: [string, string][] = [
  ["Nature & Hiking", "🥾"], ["Museums & History", "🏛️"], ["Nightlife", "🌙"], ["Beach & Sea", "🏖️"],
  ["Adventure Sports", "🧗"], ["Shopping", "🛍️"], ["Street Food", "🍜"], ["Art & Concerts", "🎨"],
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
    <ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
      <Hero step={0} title="Hi! I'm Wolfy" subtitle="Let's personalize your trip." pose="happy" />

      <View style={ui.sheet}>
        <Section title="Where do you live?" hint="flights leave from here" index={0}>
          <TextInput
            style={ui.input}
            placeholder="📍  e.g. Warsaw"
            placeholderTextColor={colors.sub}
            value={term}
            onChangeText={(t) => { setTerm(t); if (profile.homeCity) setProfile({ ...profile, homeCity: null }); }}
            autoCorrect={false}
          />
          {results.map((c) => (
            <OptionRow key={c.iata + c.countryCode} label={`${flag(c.countryCode)}  ${c.name}, ${c.countryName} · ${c.iata}`} onPress={() => pickCity(c)} />
          ))}
          {!!searchError && <Text style={[ui.error, { marginTop: 8 }]}>{searchError}</Text>}
          {profile.homeCity && (
            <View style={[ui.pill, { backgroundColor: colors.greenSoft, alignSelf: "flex-start", marginTop: 10 }]}>
              <Text style={[ui.pillText, { color: colors.green }]}>✓ {flag(profile.homeCity.countryCode)} Prices in {profile.homeCity.currency}</Text>
            </View>
          )}
        </Section>

        <Section title="What do you love doing?" hint="select any" index={1}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 8 }}>
            {ACTIVITIES.map(([a, emoji], i) => (
              <View key={a} style={{ width: "48.5%" }}>
                <Chip block label={a} emoji={emoji} tone={i} selected={profile.activities.includes(a)} onPress={() => toggleActivity(a)} />
              </View>
            ))}
          </View>
        </Section>

        <Section title="Anything else?" index={2}>
          <TextInput
            style={ui.input}
            placeholder="e.g. jazz bars, sunrise hikes"
            placeholderTextColor={colors.sub}
            value={profile.activitiesNote}
            onChangeText={(t) => setProfile({ ...profile, activitiesNote: t })}
          />
        </Section>

        <Section title="Dietary preference" index={3}>
          <View style={ui.row}>
            {DIETS.map(([value, label]) => (
              <Chip key={value} label={label} tone={3} selected={profile.diet === value} onPress={() => setProfile({ ...profile, diet: value })} />
            ))}
          </View>
        </Section>

        <Animated.View entering={FadeInDown.delay(320).springify()} style={{ gap: 16 }}>
          <Wolfy pose="think" message="Tell me what you love and I'll sniff out your trip." />
          <Button title="Continue" disabled={!canContinue} onPress={() => router.push("/trip")} />
          {!canContinue && (
            <Text style={[ui.hint, { textAlign: "center" }]}>
              {!profile.homeCity ? "Pick your home city from the list." : "Pick at least one activity."}
            </Text>
          )}
        </Animated.View>
      </View>
    </ScrollView>
  );
}
