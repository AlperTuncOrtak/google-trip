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
