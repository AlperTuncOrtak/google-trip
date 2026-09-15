import { router, usePathname } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";
import { colors, fonts } from "../lib/theme";
import Steps from "./Steps";

const LOGO: [string, string][] = [["G", colors.blue], ["o", colors.red], ["o", colors.yellow], ["g", colors.blue], ["l", colors.green], ["e", colors.red]];

export default function SidePanel() {
  const path = usePathname();
  const step = path === "/" ? 0 : path === "/trip" ? 1 : 2;
  return (
    <View style={{ width: 420, backgroundColor: colors.blueSoft, padding: 40, justifyContent: "space-between", overflow: "hidden" }}>
      <View style={{ position: "absolute", width: 320, height: 320, borderRadius: 160, backgroundColor: colors.yellow, opacity: 0.14, top: -90, right: -120 }} />
      <View style={{ position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: colors.green, opacity: 0.1, bottom: 120, left: -90 }} />

      <View style={{ gap: 28 }}>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 34 }}>
          {LOGO.map(([ch, c], i) => <Text key={i} style={{ color: c }}>{ch}</Text>)}
          <Text style={{ color: colors.ink }}> Trip</Text>
        </Text>
        <Steps current={step} />
        {path !== "/" && (
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} accessibilityRole="button" style={{ alignSelf: "flex-start" }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.blue }}>← Back</Text>
          </Pressable>
        )}
      </View>

      <View style={{ alignItems: "center", gap: 18 }}>
        <Image source={require("../../assets/wolfy-happy.png")} style={{ width: 210, height: 380 }} resizeMode="contain" />
        <Text style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 30, color: colors.ink, textAlign: "center" }}>
          Your AI travel buddy
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.sub, textAlign: "center", maxWidth: 320 }}>
          Tell Wolfy what you love and your budget — get flights, stays, activities and food that actually fit.
        </Text>
      </View>

      <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.sub }}>Powered by Gemini · Google Maps</Text>
    </View>
  );
}
