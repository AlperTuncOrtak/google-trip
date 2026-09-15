import { Linking, Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { bothMoney, Flight, Place, Stay } from "../lib/api";
import { colors, fonts, ui } from "../lib/theme";

export type Cur = { home: string; local: string };

export function ago(isoTime: string) {
  if (!isoTime) return "Cached price";
  const hours = Math.round((Date.now() - new Date(isoTime).getTime()) / 36e5);
  if (hours < 1) return "Price seen just now";
  return hours < 48 ? `Price seen ${hours}h ago` : `Price seen ${Math.round(hours / 24)}d ago`;
}

// keep the airport's local wall-clock time: drop the offset before parsing
const when = (s: string) =>
  s ? new Date(s.slice(0, 19)).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

function Pill({ text, color, soft }: { text: string; color: string; soft: string }) {
  return (
    <View style={[ui.pill, { backgroundColor: soft, alignSelf: "flex-start" }]}>
      <Text style={[ui.pillText, { color }]}>{text}</Text>
    </View>
  );
}

function Shell({ index, stripe, over, onPress, children }: {
  index: number; stripe: string; over?: boolean; onPress?: () => void; children: React.ReactNode;
}) {
  const style = [ui.card, { borderLeftWidth: 6, borderLeftColor: over ? colors.line : stripe, opacity: over ? 0.72 : 1, gap: 8 }];
  return (
    <Animated.View entering={FadeInDown.delay(70 * index).springify()}>
      {onPress ? (
        <Pressable onPress={onPress} accessibilityRole="link" style={({ pressed }) => [...style, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
          {children}
        </Pressable>
      ) : (
        <View style={style}>{children}</View>
      )}
    </Animated.View>
  );
}

const Price = ({ text }: { text: string }) => <Text style={{ fontFamily: fonts.displayBold, fontSize: 19, color: colors.ink }}>{text}</Text>;

export function FlightCard({ f, cur, index }: { f: Flight; cur: Cur; index: number }) {
  return (
    <Shell index={index} stripe={colors.blue} over={f.overBudget} onPress={() => Linking.openURL(f.url)}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.blueSoft, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: fonts.bodyBold, color: colors.blue }}>{f.airline || "✈️"}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[ui.body, { fontFamily: fonts.bodyBold }]}>{f.transfers === 0 ? "Direct" : `${f.transfers} stop${f.transfers > 1 ? "s" : ""}`}</Text>
          <Text style={ui.muted}>{when(f.departAt)} → {when(f.returnAt)}</Text>
        </View>
        {f.overBudget && <Pill text="Over budget" color={colors.red} soft={colors.redSoft} />}
      </View>
      <Price text={bothMoney(f.price, cur.home, cur.local)} />
      <Text style={ui.muted}>{f.seenAt ? `${ago(f.seenAt)} · ` : ""}View on Aviasales ↗</Text>
    </Shell>
  );
}

export function StayCard({ s, cur, index }: { s: Stay; cur: Cur; index: number }) {
  return (
    <Shell index={index} stripe={colors.yellow} over={s.overBudget}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[ui.body, { fontFamily: fonts.bodyBold }]}>{s.name}</Text>
          {s.stars > 0 && <Text style={{ color: colors.yellow, letterSpacing: 2 }}>{"★".repeat(Math.round(s.stars))}</Text>}
        </View>
        {s.overBudget && <Pill text="Over budget" color={colors.red} soft={colors.redSoft} />}
      </View>
      <Price text={bothMoney(s.price, cur.home, cur.local)} />
    </Shell>
  );
}

export function PlaceCard({ p, index, food }: { p: Place; index: number; food?: boolean }) {
  const main = food ? colors.red : colors.green;
  const soft = food ? colors.redSoft : colors.greenSoft;
  return (
    <Shell index={index} stripe={main}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: soft, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: fonts.displayBold, color: main }}>{index + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[ui.body, { fontFamily: fonts.bodyBold }]}>{p.name}</Text>
          <Text style={ui.muted}>{p.description}</Text>
        </View>
      </View>
    </Shell>
  );
}

export function Sources({ sources }: { sources: { title: string; uri: string }[] }) {
  if (sources.length === 0) return null;
  return (
    <View style={{ gap: 6, paddingHorizontal: 4 }}>
      <Text style={ui.hint}>Sources from Google Maps</Text>
      <View style={ui.row}>
        {sources.map((s) => (
          <Text key={s.uri} style={[ui.pillText, { color: colors.blue }]} onPress={() => Linking.openURL(s.uri)} accessibilityRole="link">
            📍 {s.title}
          </Text>
        ))}
      </View>
    </View>
  );
}
