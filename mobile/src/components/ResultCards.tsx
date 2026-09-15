import { Linking, Pressable, Text, View } from "react-native";
import { bothMoney, DEMO_MODE, Flight, money, Place, Stay } from "../lib/api";
import { colors, ui } from "../lib/theme";

export type Cur = { home: string; local: string };

export function ago(isoTime: string) {
  if (!isoTime) return "Cached price";
  const hours = Math.round((Date.now() - new Date(isoTime).getTime()) / 36e5);
  if (hours < 1) return "Price seen just now";
  return hours < 48 ? `Price seen ${hours}h ago` : `Price seen ${Math.round(hours / 24)}d ago`;
}

const when = (s: string) => (s ? s.slice(0, 16).replace("T", " ") : "—");

function OverBudget() {
  return <Text style={{ color: colors.red, fontWeight: "700", fontSize: 12 }}>Over budget</Text>;
}

function Head({ title, over }: { title: string; over: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
      <Text style={{ fontWeight: "700", flexShrink: 1 }}>{title}</Text>
      {over && <OverBudget />}
    </View>
  );
}

export function FlightCard({ f, cur }: { f: Flight; cur: Cur }) {
  const stops = f.transfers === 0 ? "Direct" : `${f.transfers} stop${f.transfers > 1 ? "s" : ""}`;
  return (
    <Pressable style={[ui.card, f.overBudget && { opacity: 0.6 }]} onPress={() => Linking.openURL(f.url)} accessibilityRole="link">
      <Head title={`${f.airline} · ${stops}`} over={f.overBudget} />
      <Text style={ui.muted}>Out {when(f.departAt)} · Back {when(f.returnAt)}</Text>
      <Text style={{ fontSize: 16, fontWeight: "700" }}>{bothMoney(f.price, cur.home, cur.local)}</Text>
      <Text style={ui.muted}>{ago(f.seenAt)}{DEMO_MODE ? " · Affiliate link" : ""}</Text>
    </Pressable>
  );
}

export function StayCard({ s, cur }: { s: Stay; cur: Cur }) {
  return (
    <View style={[ui.card, s.overBudget && { opacity: 0.6 }]}>
      <Head title={s.name} over={s.overBudget} />
      {s.stars > 0 && <Text style={{ color: colors.yellow }}>{"★".repeat(Math.round(s.stars))}</Text>}
      <Text style={{ fontSize: 16, fontWeight: "700" }}>{bothMoney(s.price, cur.home, cur.local)}</Text>
      {DEMO_MODE && <Text style={{ color: colors.green, fontWeight: "600" }}>We earn ≈ {money(s.commission.home, cur.home)}</Text>}
    </View>
  );
}

export function PlaceCard({ p }: { p: Place }) {
  return (
    <View style={ui.card}>
      <Text style={{ fontWeight: "700" }}>{p.name}</Text>
      <Text style={ui.muted}>{p.description}</Text>
    </View>
  );
}

export function Sources({ sources }: { sources: { title: string; uri: string }[] }) {
  if (sources.length === 0) return null;
  return (
    <View style={{ gap: 4 }}>
      <Text style={ui.muted}>Sources from Google Maps</Text>
      {sources.map((s) => (
        <Text key={s.uri} style={{ color: colors.blue }} onPress={() => Linking.openURL(s.uri)} accessibilityRole="link">
          {s.title}
        </Text>
      ))}
    </View>
  );
}
