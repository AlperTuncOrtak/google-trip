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

  const line = (label: string, m: Money, color = colors.text, approx = false) => (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
      <Text style={ui.muted}>{label}</Text>
      <Text style={{ fontWeight: "700", color, flexShrink: 1, textAlign: "right" }}>
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
        {line("Budget", b.total)}
        {line("Cheapest flight + stay", b.flightAndStay)}
        {line(`Daily spend × ${b.days} days`, b.dailySpendTotal, colors.text, true)}
        {line("Remaining", b.remaining, b.fits ? colors.green : colors.red)}
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
