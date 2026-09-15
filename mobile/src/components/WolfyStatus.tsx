import { ActivityIndicator, View } from "react-native";
import { colors } from "../lib/theme";
import Button from "./Button";
import Wolfy, { Pose } from "./Wolfy";

export default function WolfyStatus({ message, loading, onRetry, pose }: {
  message: string; loading?: boolean; onRetry?: () => void; pose?: Pose;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.blueSoft, alignItems: "center", justifyContent: "center", padding: 24, gap: 24 }}>
      <Wolfy size="large" pose={pose ?? (loading ? "sniff" : "think")} message={message} />
      {loading && <ActivityIndicator size="large" color={colors.blue} />}
      {onRetry && <View style={{ alignSelf: "stretch" }}><Button title="Try again" onPress={onRetry} /></View>}
    </View>
  );
}
