import { Stack } from "expo-router";
import { StoreProvider } from "../lib/store";

export default function Layout() {
  return (
    <StoreProvider>
      <Stack screenOptions={{ headerTitle: "Google Trip" }} />
    </StoreProvider>
  );
}
