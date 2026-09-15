import { Pressable, Text } from "react-native";
import { colors, fonts, shadow } from "../lib/theme";

export default function Button({ title, onPress, disabled, variant = "primary" }: {
  title: string; onPress: () => void; disabled?: boolean; variant?: "primary" | "outline";
}) {
  const primary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        {
          borderRadius: 999, paddingVertical: 16, alignItems: "center",
          backgroundColor: primary ? colors.blue : colors.bg,
          borderWidth: primary ? 0 : 1.5, borderColor: colors.blue,
          opacity: disabled ? 0.4 : 1, transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        primary && !disabled && shadow,
      ]}
    >
      <Text style={{ fontFamily: fonts.display, fontSize: 18, color: primary ? "#FFFFFF" : colors.blue }}>{title}</Text>
    </Pressable>
  );
}
