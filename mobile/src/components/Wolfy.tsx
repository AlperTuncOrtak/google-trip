import { Image, StyleSheet, Text, View } from "react-native";
import { colors, fonts, shadow } from "../lib/theme";

export type Pose = "happy" | "sniff" | "think";

const POSES = {
  happy: require("../../assets/wolfy-happy.png"),
  sniff: require("../../assets/wolfy-sniff.png"),
  think: require("../../assets/wolfy.png"),
};

export function WolfyAvatar({ pose = "happy", size = 88 }: { pose?: Pose; size?: number }) {
  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Image source={POSES[pose]} style={{ width: size * 0.9, height: size * 1.05, marginTop: size * 0.18 }} resizeMode="contain" />
    </View>
  );
}

// animation hook-in point for later: everything Wolfy renders goes through this file
export default function Wolfy({ message, pose = "happy", size = "small" }: { message: string; pose?: Pose; size?: "small" | "large" }) {
  if (size === "large") {
    return (
      <View style={s.column} accessibilityLabel={`Wolfy says: ${message}`}>
        <Image source={POSES[pose]} style={s.imgLarge} resizeMode="contain" />
        <View style={[s.bubble, s.bubbleLarge]}>
          <Text style={[s.text, s.textLarge]}>{message}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={s.row} accessibilityLabel={`Wolfy says: ${message}`}>
      <WolfyAvatar pose={pose} size={56} />
      <View style={s.bubble}>
        <Text style={s.text}>{message}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  avatar: { backgroundColor: colors.bg, overflow: "hidden", alignItems: "center", borderWidth: 3, borderColor: colors.bg, ...shadow },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  column: { alignItems: "center", gap: 18 },
  imgLarge: { width: 150, height: 250 },
  bubble: {
    flexShrink: 1, backgroundColor: colors.blueSoft, borderRadius: 20, borderTopLeftRadius: 6,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  bubbleLarge: { borderTopLeftRadius: 20, maxWidth: 300, backgroundColor: colors.bg, ...shadow },
  text: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 20, color: colors.ink },
  textLarge: { fontFamily: fonts.display, fontSize: 20, lineHeight: 26, textAlign: "center" },
});
