import { ReactNode, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import Hero from "../components/Hero";
import { FlightCard, PlaceCard, Sources, StayCard } from "../components/ResultCards";
import Wolfy from "../components/Wolfy";
import WolfyStatus from "../components/WolfyStatus";
import { flag, money, Plan, postPlan } from "../lib/api";
import { useStore } from "../lib/store";
import { colors, fonts, shadow, ui } from "../lib/theme";
import { useRequest } from "../lib/useRequest";

const TABS = [["Flights", "✈️"], ["Stays", "🏨"], ["Activities", "🎟️"], ["Food", "🍜"]] as const;
type Tab = (typeof TABS)[number][0];

export default function ResultsScreen() {
  const { profile, trip, destination } = useStore();
  const [tab, setTab] = useState<Tab>("Flights");
  const { data, error, retry } = useRequest(() => postPlan(profile, trip, destination ?? { countryCode: "" }));

  if (!destination) return <WolfyStatus message="Pick a country first!" />;
  if (error) return <WolfyStatus message="Oops, I lost the scent. Try again?" onRetry={retry} />;
  if (!data) return <WolfyStatus loading message="Sniffing out the best deals…" />;

  const cur = data.currencies;
  const b = data.budget;
  const spentHome = b.flightAndStay.home + b.dailySpendTotal.home;
  const spentLocal = b.flightAndStay.local + b.dailySpendTotal.local;
  const ratio = b.total.home > 0 ? Math.min(spentHome / b.total.home, 1) : 0;
  const statusColor = b.fits ? colors.green : colors.red;

  const row = (icon: string, label: string, value: string, color: string = colors.ink) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Text style={{ fontSize: 16, width: 24 }}>{icon}</Text>
      <Text style={[ui.body, { flex: 1, color: colors.sub }]}>{label}</Text>
      <Text style={[ui.body, { fontFamily: fonts.bodyBold, color }]}>{value}</Text>
    </View>
  );

  const section = (key: keyof Plan["errors"], count: number, render: () => ReactNode) => {
    if (data.errors[key]) return <Text style={[ui.error, { textAlign: "center" }]}>Unavailable right now — try again in a moment.</Text>;
    if (count === 0) return <Text style={[ui.hint, { textAlign: "center" }]}>No results found.</Text>;
    const sample = (data.sample ?? []).includes(key);
    return (
      <>
        <View style={[ui.pill, { alignSelf: "flex-start", backgroundColor: sample ? colors.yellowSoft : colors.greenSoft }]}>
          <Text style={[ui.pillText, { color: sample ? "#B06000" : colors.green }]}>{sample ? "Sample data" : "● Live data"}</Text>
        </View>
        {render()}
      </>
    );
  };

  return (
    <ScrollView contentContainerStyle={ui.page}>
      <Hero
        eyebrow={`${b.days} NIGHTS · ${trip.travelers} TRAVELER${trip.travelers > 1 ? "S" : ""}`}
        title={`${flag(data.destination.countryCode)} ${data.destination.city}`}
        subtitle={data.destination.reason || data.destination.countryName}
        pose={b.fits ? "happy" : "think"}
      />

      <View style={ui.sheet}>
        <Animated.View entering={FadeInDown.springify()} style={[ui.card, { gap: 14, marginTop: -8 }]}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <View style={{ flexShrink: 1 }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 36, color: colors.ink }}>{money(spentHome, cur.home)}</Text>
              <Text style={ui.muted}>
                of {money(b.total.home, cur.home)}
                {cur.home !== cur.local ? `  ·  ≈ ${money(spentLocal, cur.local)}` : ""}
              </Text>
            </View>
            <View style={[ui.pill, { backgroundColor: b.fits ? colors.greenSoft : colors.redSoft, paddingVertical: 6 }]}>
              <Text style={[ui.pillText, { color: statusColor }]}>{b.fits ? "✓ Within budget" : "Over budget"}</Text>
            </View>
          </View>

          <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.surface, overflow: "hidden" }}>
            <View style={{ width: `${ratio * 100}%`, height: "100%", borderRadius: 5, backgroundColor: statusColor }} />
          </View>

          <View style={{ gap: 8 }}>
            {row("✈️", "Cheapest flight + stay", money(b.flightAndStay.home, cur.home))}
            {row("🍽️", `Daily spend × ${b.days} days`, `≈ ${money(b.dailySpendTotal.home, cur.home)}`)}
            {row("💰", "Remaining", money(b.remaining.home, cur.home), statusColor)}
          </View>
        </Animated.View>

        <Wolfy
          pose={b.fits ? "happy" : "think"}
          message={b.fits ? "All of this fits your budget!" : "It's a bit over budget — here are the cheapest options."}
        />

        <View style={[{ flexDirection: "row", backgroundColor: colors.bg, borderRadius: 20, padding: 5, gap: 4 }, shadow]}>
          {TABS.map(([t, icon]) => {
            const on = tab === t;
            return (
              <Pressable key={t} onPress={() => setTab(t)} accessibilityRole="tab" accessibilityState={{ selected: on }}
                style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 16, backgroundColor: on ? colors.blueSoft : "transparent" }}>
                <Text style={{ fontSize: 18 }}>{icon}</Text>
                <Text style={{ fontFamily: on ? fonts.bodyBold : fonts.bodyMedium, fontSize: 12, color: on ? colors.blue : colors.sub }}>{t}</Text>
              </Pressable>
            );
          })}
        </View>

        <View key={tab} style={{ gap: 12 }}>
          {tab === "Flights" && section("flights", data.flights.length, () =>
            data.flights.map((f, i) => <FlightCard key={i} index={i} f={f} cur={cur} />))}

          {tab === "Stays" && section("stays", data.stays.length, () =>
            data.stays.map((s, i) => <StayCard key={i} index={i} s={s} cur={cur} />))}

          {tab === "Activities" && section("places", data.activities.length, () => (
            <>
              {data.activities.map((p, i) => <PlaceCard key={i} index={i} p={p} />)}
              <Sources sources={data.sources} />
            </>
          ))}

          {tab === "Food" && section("places", data.food.length, () => (
            <>
              {data.food.map((p, i) => <PlaceCard key={i} index={i} p={p} food />)}
              <Sources sources={data.sources} />
            </>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
