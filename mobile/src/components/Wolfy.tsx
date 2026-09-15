import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "../lib/theme";

export default function Wolfy({ message, size = "small" }: { message: string; size?: "small" | "large" }) {
  const large = size === "large";
  return (
    <View style={large ? s.column : s.row} accessibilityLabel={`Wolfy says: ${message}`}>
      <Image source={require("../../assets/wolfy.png")} style={large ? s.imgLarge : s.imgSmall} resizeMode="contain" />
      <View style={[s.bubble, large && s.bubbleLarge]}>
        <Text style={[s.text, large && s.textLarge]}>{message}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  column: { alignItems: "center", gap: 12 },
  imgSmall: { width: 64, height: 75 },
  imgLarge: { width: 200, height: 234 },
  bubble: {
    flexShrink: 1, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
    borderRadius: 16, borderBottomLeftRadius: 4, paddingHorizontal: 12, paddingVertical: 10,
  },
  bubbleLarge: { borderBottomLeftRadius: 16, maxWidth: 300 },
  text: { fontSize: 15, color: colors.text },
  textLarge: { fontSize: 17, textAlign: "center" },
});
