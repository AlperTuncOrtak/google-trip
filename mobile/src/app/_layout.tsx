import { Figtree_400Regular, Figtree_600SemiBold, Figtree_700Bold } from "@expo-google-fonts/figtree";
import { Fredoka_600SemiBold, Fredoka_700Bold, useFonts } from "@expo-google-fonts/fredoka";
import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { StoreProvider } from "../lib/store";
import { colors, fonts } from "../lib/theme";

export default function Layout() {
  const [loaded] = useFonts({ Fredoka_600SemiBold, Fredoka_700Bold, Figtree_400Regular, Figtree_600SemiBold, Figtree_700Bold });

  if (!loaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.blueSoft }}>
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  }

  return (
    <StoreProvider>
      <Stack
        screenOptions={{
          headerTitle: "Google Trip",
          headerTitleStyle: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
          headerStyle: { backgroundColor: colors.blueSoft },
          headerShadowVisible: false,
          headerTintColor: colors.blue,
          contentStyle: { backgroundColor: colors.blueSoft },
        }}
      />
    </StoreProvider>
  );
}
