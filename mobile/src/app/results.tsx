import { ReactNode, useState } from "react";
import { ImageBackground, Pressable, ScrollView, Share, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import Button from "../components/Button";
import { FlightCard, PlaceCard, Sources, StayCard } from "../components/ResultCards";
import Steps from "../components/Steps";
import { WolfyAvatar } from "../components/Wolfy";
import WolfyStatus from "../components/WolfyStatus";
import { flag, money, Plan, postPlan } from "../lib/api";
import { useStore } from "../lib/store";
import { colors, fonts, shadow, ui } from "../lib/theme";
import { useRequest } from "../lib/useRequest";
import { useWide } from "../lib/useWide";

const TABS = ["Flights", "Stays", "Activities", "Food"] as const;
type Tab = (typeof TABS)[number];
const DIET_LABEL: Record<string, string> = { vegetarian: "🥗 Vegetarian", vegan: "🌱 Vegan", halal: "🍖 Halal", gluten_free: "🌾 Gluten-free" };

const shortDate = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default function ResultsScreen() {
  const { profile, trip, destination } = useStore();
  const [tab, setTab] = useState<Tab>("Flights");
  const wide = useWide();
  const { data, error, retry } = useRequest(() => postPlan(profile, trip, destination ?? { countryCode: "" }));

  if (!destination) return <WolfyStatus message="Pick a country first!" />;
  if (error) return <WolfyStatus message="Oops, I lost the scent. Try again?" onRetry={retry} />;
  if (!data) return <WolfyStatus loading message="Sniffing out the best deals…" />;

  const cur = data.currencies;
  const b = data.budget;
  const d = data.destination;
  const spent = b.flightAndStay.home + b.dailySpendTotal.home;
  const total = Math.max(b.total.home, spent, 1);
  const seg = (v: number) => `${Math.max(0, (v / total) * 100)}%` as const;

  const share = () => Share.share({
    message: [
      `My ${b.days}-night trip to ${d.city}, ${d.countryName} ${flag(d.countryCode)} — planned with Google Trip & Wolfy`,
      `${money(spent, cur.home)} of ${money(b.total.home, cur.home)} budget`,
      data.stays[0] && `🏨 ${data.stays[0].name} · ${money(data.stays[0].price.home, cur.home)}`,
      data.activities.length > 0 && `🎟️ ${data.activities.slice(0, 3).map((a) => a.name).join(", ")}`,
      data.food.length > 0 && `🍜 ${data.food.slice(0, 3).map((f) => f.name).join(", ")}`,
    ].filter(Boolean).join("\n"),
  });

  const row = (icon: string, label: string, value: string, color: string = colors.ink) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Text style={{ fontSize: 18, width: 26 }}>{icon}</Text>
      <Text style={[ui.body, { flex: 1 }]}>{label}</Text>
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

  const prefs = [...profile.activities, ...(DIET_LABEL[profile.diet] ? [DIET_LABEL[profile.diet]] : [])];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 32, paddingBottom: 150, gap: 18, width: "100%", maxWidth: 560, alignSelf: "center" }}>
        {!wide && <Steps current={2} />}

        {/* destination hero card */}
        <Animated.View entering={FadeInDown.springify()} style={[{ borderRadius: 24, backgroundColor: colors.bg }, shadow]}>
          <View style={{ position: "absolute", top: -14, right: 4, zIndex: 2, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={[{ backgroundColor: colors.bg, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 }, shadow]}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: colors.ink }}>
                {b.fits ? "Found your perfect match!" : "Close — a bit over budget"}
              </Text>
            </View>
            <WolfyAvatar pose={b.fits ? "happy" : "think"} size={58} />
          </View>

          <ImageBackground
            source={d.photo ? { uri: d.photo } : undefined}
            style={{ borderRadius: 24, overflow: "hidden", backgroundColor: colors.blue }}
            imageStyle={{ borderRadius: 24 }}
            resizeMode="cover"
          >
            <View style={{ padding: 18, paddingTop: 40, gap: 10, backgroundColor: "rgba(10, 20, 40, 0.55)" }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 26, color: "#FFFFFF" }}>
                {flag(d.countryCode)} {d.city}, {d.countryName}
              </Text>
              {!!d.reason && <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20, color: "#EEF2FF" }}>{d.reason}</Text>}
              <Text style={{ color: "#FFFFFF" }}>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 28 }}>{money(spent, cur.home)}</Text>
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14 }}>
                  {`  of ${money(b.total.home, cur.home)}`}{cur.home !== cur.local ? ` (≈ ${money(b.total.local, cur.local)})` : ""}
                </Text>
              </Text>
              <View style={{ flexDirection: "row", height: 10, borderRadius: 5, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.25)" }}>
                <View style={{ width: seg(b.flightAndStay.home), backgroundColor: "#8AB4F8" }} />
                <View style={{ width: seg(b.dailySpendTotal.home), backgroundColor: "#F28B82" }} />
                <View style={{ width: seg(b.remaining.home), backgroundColor: "#81C995" }} />
              </View>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: "#FFFFFF" }}>
                {b.fits ? "✅ On track: Budget OK!" : "⚠️ Over budget — cheapest options shown"}
              </Text>
            </View>
          </ImageBackground>

          <View style={{ padding: 16, gap: 10 }}>
            {row("✈️", "Flight + stay", money(b.flightAndStay.home, cur.home))}
            {row("🍽️", `Daily spend × ${b.days} days`, `≈ ${money(b.dailySpendTotal.home, cur.home)}`)}
            {row("💰", "Remaining", money(b.remaining.home, cur.home), b.fits ? colors.green : colors.red)}
          </View>
        </Animated.View>

        {prefs.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={ui.label}>Selected preferences</Text>
            <View style={ui.row}>
              {prefs.map((p, i) => (
                <View key={p} style={[ui.pill, { backgroundColor: i % 2 ? colors.greenSoft : colors.yellowSoft, paddingVertical: 6 }]}>
                  <Text style={[ui.pillText, { color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 13 }]}>{p}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* underline tabs */}
        <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.line }}>
          {TABS.map((t) => {
            const on = tab === t;
            return (
              <Pressable key={t} onPress={() => setTab(t)} accessibilityRole="tab" accessibilityState={{ selected: on }}
                style={{ flex: 1, alignItems: "center", paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: on ? colors.blue : "transparent", marginBottom: -1 }}>
                <Text style={{ fontFamily: on ? fonts.bodyBold : fonts.bodyMedium, fontSize: 15, color: on ? colors.blue : colors.ink }}>{t}</Text>
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
      </ScrollView>

      {/* sticky footer: trip summary pill + share */}
      <View style={{ position: "absolute", left: 16, right: 16, bottom: 16, gap: 10, alignItems: "center", maxWidth: 528, marginHorizontal: "auto" }}>
        <View style={[{ backgroundColor: colors.blueSoft, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }, shadow]}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink }}>
            {`${shortDate(trip.departDate)} – ${shortDate(trip.returnDate)}  |  ${trip.travelers} traveler${trip.travelers > 1 ? "s" : ""}`}
          </Text>
        </View>
        <View style={{ alignSelf: "stretch" }}>
          <Button title="Share my trip" onPress={share} />
        </View>
      </View>
    </View>
  );
}
