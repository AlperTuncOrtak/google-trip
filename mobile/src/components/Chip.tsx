import { Pressable, Text } from "react-native";
import { accent, colors, fonts } from "../lib/theme";

export default function Chip({ label, selected, onPress, emoji, tone = 0, block }: {
  label: string; selected: boolean; onPress: () => void; emoji?: string; tone?: number; block?: boolean;
}) {
  const a = accent(tone);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => ({
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5,
        borderColor: selected ? a.main : colors.line,
        backgroundColor: selected ? a.soft : colors.bg,
        transform: [{ scale: pressed ? 0.96 : 1 }],
        ...(block ? { width: "100%", borderRadius: 14, paddingVertical: 10 } : null),
      })}
    >
      {emoji && <Text style={{ fontSize: 15 }}>{emoji}</Text>}
      <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: selected ? fonts.bodyBold : fonts.bodyMedium, fontSize: block ? 13 : 14, color: selected ? a.main : colors.ink }}>
        {label}
      </Text>
    </Pressable>
  );
}
