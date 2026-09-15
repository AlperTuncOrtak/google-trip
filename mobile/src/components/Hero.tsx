import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, ui } from "../lib/theme";
import { Pose, WolfyAvatar } from "./Wolfy";

// soft Google-colored orbs give the header depth without images
function Orbs() {
  return (
    <>
      <View style={[s.orb, { width: 180, height: 180, top: -60, right: -40, backgroundColor: colors.yellow, opacity: 0.16 }]} />
      <View style={[s.orb, { width: 120, height: 120, top: 70, left: -50, backgroundColor: colors.green, opacity: 0.12 }]} />
      <View style={[s.orb, { width: 70, height: 70, top: 20, left: "45%", backgroundColor: colors.red, opacity: 0.1 }]} />
    </>
  );
}

export default function Hero({ eyebrow, title, subtitle, pose, children }: {
  eyebrow?: string; title: string; subtitle?: string; pose?: Pose; children?: ReactNode;
}) {
  return (
    <View style={s.hero}>
      <Orbs />
      <View style={s.row}>
        <View style={{ flex: 1, gap: 6 }}>
          {eyebrow && <Text style={ui.eyebrow}>{eyebrow}</Text>}
          <Text style={ui.h1}>{title}</Text>
          {subtitle && <Text style={[ui.body, { color: colors.sub }]}>{subtitle}</Text>}
        </View>
        {pose && <WolfyAvatar pose={pose} size={76} />}
      </View>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  hero: { backgroundColor: colors.blueSoft, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, overflow: "hidden", gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  orb: { position: "absolute", borderRadius: 999 },
});
