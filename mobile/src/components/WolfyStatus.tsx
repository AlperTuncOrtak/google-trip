import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { colors, ui } from "../lib/theme";
import Wolfy from "./Wolfy";

export default function WolfyStatus({ message, loading, onRetry }: { message: string; loading?: boolean; onRetry?: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: 24, gap: 20 }}>
      <Wolfy size="large" message={message} />
      {loading && <ActivityIndicator size="large" color={colors.blue} />}
      {onRetry && (
        <Pressable style={[ui.button, { paddingHorizontal: 32 }]} onPress={onRetry} accessibilityRole="button">
          <Text style={ui.buttonText}>Try again</Text>
        </Pressable>
      )}
    </View>
  );
}
