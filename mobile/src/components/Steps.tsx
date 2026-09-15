import { Text, View } from "react-native";
import { colors, fonts } from "../lib/theme";

const STEPS = ["Preferences", "Budget", "Your trip"];

export default function Steps({ current }: { current: 0 | 1 | 2 }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start" }} accessibilityLabel={`Step ${current + 1} of 3: ${STEPS[current]}`}>
      {STEPS.map((label, i) => {
        const done = i < current;
        const on = i === current;
        return (
          <View key={label} style={{ flex: 1, alignItems: "center", gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", alignSelf: "stretch", height: 16 }}>
              <View style={{ flex: 1, height: 3, backgroundColor: i === 0 ? "transparent" : i <= current ? colors.blue : colors.line }} />
              <View style={{
                width: on ? 16 : 12, height: on ? 16 : 12, borderRadius: 8,
                backgroundColor: done ? colors.blue : colors.bg, borderWidth: on ? 4 : 2, borderColor: i <= current ? colors.blue : colors.line,
              }} />
              <View style={{ flex: 1, height: 3, backgroundColor: i === STEPS.length - 1 ? "transparent" : i < current ? colors.blue : colors.line }} />
            </View>
            <Text style={{ fontFamily: on ? fonts.bodyBold : fonts.bodyMedium, fontSize: 11, color: on ? colors.ink : colors.sub }}>
              {`STEP ${i + 1}`}
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.sub, marginTop: -6 }}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}
