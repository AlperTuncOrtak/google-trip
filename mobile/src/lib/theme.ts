import { StyleSheet } from "react-native";

export const colors = {
  bg: "#F8FAFD", card: "#FFFFFF", text: "#1F1F1F", muted: "#5F6368", border: "#DADCE0",
  blue: "#1A73E8", red: "#D93025", green: "#188038", yellow: "#F9AB00",
};

export const ui = StyleSheet.create({
  screen: { flexGrow: 1, backgroundColor: colors.bg, padding: 16, gap: 16 },
  h1: { fontSize: 24, fontWeight: "700", color: colors.text },
  label: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 6 },
  muted: { fontSize: 13, color: colors.muted },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text,
  },
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 4 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  button: { backgroundColor: colors.blue, borderRadius: 24, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  buttonDisabled: { opacity: 0.4 },
  error: { color: colors.red, fontSize: 14 },
});
