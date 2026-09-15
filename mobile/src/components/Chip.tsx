import { Pressable, Text } from "react-native";
import { colors } from "../lib/theme";

export default function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
        borderColor: selected ? colors.blue : colors.border,
        backgroundColor: selected ? "#E8F0FE" : colors.card,
      }}
    >
      <Text style={{ color: selected ? colors.blue : colors.text, fontWeight: selected ? "700" : "400" }}>{label}</Text>
    </Pressable>
  );
}
