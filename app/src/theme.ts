import { Platform } from "react-native";

// Palette taken from the Awa logo: deep navy, golden yellow, soft sky blue and cream.
export const C = {
  bg: "#F4F7FB",
  card: "#FFFFFF",
  ink: "#172A46",        // logo navy
  sub: "#5B6B82",
  line: "#DDE5EF",
  brand: "#172A46",      // primary (navy)
  brandDark: "#0F1D33",
  brandSoft: "#E3EEF8",  // logo sky blue
  gold: "#E9BE55",       // logo car yellow
  goldSoft: "#FBF1CF",   // logo cream
  green: "#1F7A4D",
  greenDark: "#14532D",
  greenSoft: "#DCF2E4",
  amber: "#B7791F",
  amberSoft: "#FEF3C7",
  red: "#C23B3B",
  redDark: "#8B1F1F",
  redSoft: "#FBE4E4",
  neutral: "#475569",
  neutralSoft: "#EEF2F7",
};

export const R = { card: 16, btn: 12, pill: 999 };

// Serif for headings, like the "Awa" wordmark.
export const FONT_SERIF = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "Georgia, 'Times New Roman', serif",
}) as string;
