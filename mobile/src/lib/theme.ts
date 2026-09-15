import { StyleSheet } from "react-native";

export const colors = {
  bg: "#FFFFFF", surface: "#F4F7FC", ink: "#1B1C1F", sub: "#5F6368", line: "#E3E7EE",
  blue: "#1A73E8", blueSoft: "#E8F0FE",
  red: "#EA4335", redSoft: "#FCE8E6",
  yellow: "#F9AB00", yellowSoft: "#FEF4D6",
  green: "#1E8E3E", greenSoft: "#E6F4EA",
};

// Google four-color rhythm for chips, stripes and badges
export const accents = [
  { main: colors.blue, soft: colors.blueSoft },
  { main: colors.red, soft: colors.redSoft },
  { main: colors.yellow, soft: colors.yellowSoft },
  { main: colors.green, soft: colors.greenSoft },
];
export const accent = (i: number) => accents[i % accents.length];

export const fonts = {
  display: "Fredoka_600SemiBold",
  displayBold: "Fredoka_700Bold",
  body: "Figtree_400Regular",
  bodyMedium: "Figtree_600SemiBold",
  bodyBold: "Figtree_700Bold",
};

export const shadow = { boxShadow: "0 8px 24px rgba(26, 115, 232, 0.10)" } as const;

export const ui = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: colors.surface, paddingBottom: 40 },
  sheet: {
    marginTop: -28, backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 16, paddingTop: 20, gap: 18,
  },
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.4, color: colors.blue },
  h1: { fontFamily: fonts.displayBold, fontSize: 26, lineHeight: 31, color: colors.ink },
  h2: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
  label: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, marginBottom: 10 },
  hint: { fontFamily: fonts.body, fontSize: 13, color: colors.sub },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.ink },
  muted: { fontFamily: fonts.body, fontSize: 13, color: colors.sub },
  error: { fontFamily: fonts.bodyMedium, color: colors.red, fontSize: 14 },
  input: {
    backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.line, borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontFamily: fonts.bodyMedium, color: colors.ink,
  },
  card: { backgroundColor: colors.bg, borderRadius: 20, padding: 14, gap: 6, ...shadow },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 12 },
});
