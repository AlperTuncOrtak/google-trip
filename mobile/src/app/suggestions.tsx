import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import Hero from "../components/Hero";
import WolfyStatus from "../components/WolfyStatus";
import { flag, money, postSuggest } from "../lib/api";
import { useStore } from "../lib/store";
import { accent, colors, fonts, ui } from "../lib/theme";
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
    <ScrollView contentContainerStyle={ui.page}>
      <Hero
        eyebrow="PICKED FOR YOU"
        title={`I found ${n} place${n > 1 ? "s" : ""} you'll love!`}
        subtitle={`Matched to your interests and your ${money(trip.budget, home)} budget.`}
        pose="happy"
      />

      <View style={ui.sheet}>
        {data.suggestions.map((s, i) => {
          const a = accent(i);
          return (
            <Animated.View key={s.iata} entering={FadeInDown.delay(120 * i).springify()}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setDestination({ countryCode: s.countryCode, city: { name: s.city, iata: s.iata, reason: s.reason } });
                  router.push("/results");
                }}
                style={({ pressed }) => [ui.card, { gap: 12, borderLeftWidth: 6, borderLeftColor: a.main, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                  <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: a.soft, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 30 }}>{flag(s.countryCode)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={ui.h2}>{s.city}</Text>
                    <Text style={ui.muted}>{s.countryName}</Text>
                  </View>
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 24, color: a.main }}>›</Text>
                </View>
                <Text style={ui.body}>{s.reason}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <View style={[ui.pill, { backgroundColor: colors.blueSoft }]}>
                    <Text style={[ui.pillText, { color: colors.blue }]}>✈️ from {money(s.flightPrice.home, home)}</Text>
                  </View>
                  {s.localCurrency !== home && <Text style={ui.muted}>≈ {money(s.flightPrice.local, s.localCurrency)}</Text>}
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </ScrollView>
  );
}
