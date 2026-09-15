import { ReactNode } from "react";
import { Pressable, Text } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { colors, fonts, ui } from "../lib/theme";

export function Section({ title, hint, index, children }: { title: string; hint?: string; index: number; children: ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.delay(80 * index).springify()}>
      <Text style={ui.label}>
        {title}{hint ? <Text style={ui.hint}>  {hint}</Text> : null}
      </Text>
      {children}
    </Animated.View>
  );
}

export function OptionRow({ label, onPress, icon = "›" }: { label: string; onPress: () => void; icon?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      style={({ pressed }) => [ui.card, { flexDirection: "row", alignItems: "center", marginTop: 8, paddingVertical: 14, opacity: pressed ? 0.7 : 1 }]}>
      <Text style={[ui.body, { flex: 1, fontFamily: fonts.bodyMedium }]}>{label}</Text>
      <Text style={{ color: colors.blue, fontFamily: fonts.displayBold, fontSize: 20 }}>{icon}</Text>
    </Pressable>
  );
}
