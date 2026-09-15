import { useWindowDimensions } from "react-native";

// desktop / pitch screen: side panel + content column instead of a stretched phone layout
export const useWide = () => useWindowDimensions().width >= 1000;
