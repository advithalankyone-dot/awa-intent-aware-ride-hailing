import React from "react";
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { INTENT_OPTIONS, Intent } from "./config";
import { C, R } from "./theme";

// The map lives in RideMap.tsx (phone) / RideMap.web.tsx (browser); the bundler picks the right one.
export { RideMap } from "./RideMap";

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}

export function Chip(props: { label: string; selected: boolean; onPress: () => void; color?: string }) {
  const on = props.color ?? C.brand;
  return (
    <TouchableOpacity
      onPress={props.onPress}
      style={[s.chip, props.selected && { backgroundColor: on, borderColor: on }]}
    >
      <Text style={[s.chipText, props.selected && { color: "white" }]}>{props.label}</Text>
    </TouchableOpacity>
  );
}

export function IntentBadge({ intent }: { intent: Intent }) {
  const opt = INTENT_OPTIONS.find((o) => o.value === intent)!;
  return (
    <View style={[s.badge, { backgroundColor: opt.color }]}>
      <Text style={s.badgeText}>{opt.label}</Text>
    </View>
  );
}

type Variant = "primary" | "success" | "danger" | "neutral" | "ghost";
const VARIANT_COLOR: Record<Variant, string> = {
  primary: C.gold, success: C.green, danger: C.red, neutral: C.neutral, ghost: "transparent",
};

export function Button(props: { label: string; onPress: () => void; variant?: Variant; disabled?: boolean }) {
  const v = props.variant ?? "primary";
  const ghost = v === "ghost";
  return (
    <TouchableOpacity
      onPress={props.onPress}
      disabled={props.disabled}
      style={[
        s.button,
        { backgroundColor: VARIANT_COLOR[v], opacity: props.disabled ? 0.5 : 1 },
        ghost && { borderWidth: 1, borderColor: C.line },
      ]}
    >
      <Text style={[s.buttonText, (ghost || v === "primary") && { color: C.ink }]}>{props.label}</Text>
    </TouchableOpacity>
  );
}

type Tone = "info" | "success" | "danger" | "neutral";
const TONES: Record<Tone, { bg: string; fg: string }> = {
  info: { bg: C.brandSoft, fg: C.brandDark },
  success: { bg: C.greenSoft, fg: C.greenDark },
  danger: { bg: C.redSoft, fg: C.redDark },
  neutral: { bg: C.neutralSoft, fg: C.neutral },
};

export function Banner({ text, tone }: { text: string; tone: Tone }) {
  const t = TONES[tone];
  return (
    <View style={[s.banner, { backgroundColor: t.bg }]}>
      <Text style={[s.bannerText, { color: t.fg }]}>{text}</Text>
    </View>
  );
}

const STEP_LABELS = ["Requested", "Matched", "Accepted", "Completed"];

// Segmented progress bar. current = index of the last finished step (0..3).
export function Steps({ current }: { current: number }) {
  return (
    <View style={s.steps}>
      {STEP_LABELS.map((label, i) => (
        <View key={label} style={s.stepCol}>
          <View style={[s.stepBar, i <= current && { backgroundColor: C.gold }]} />
          <Text style={[s.stepText, i <= current && { color: C.ink, fontWeight: "600" }]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

export const s = StyleSheet.create({
  card: {
    backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.line,
    padding: 16, marginBottom: 14,
  },
  label: { fontSize: 13, fontWeight: "700", color: C.sub, marginBottom: 8, marginTop: 4, letterSpacing: 0.3 },
  chip: {
    borderWidth: 1, borderColor: C.line, borderRadius: R.pill, backgroundColor: C.card,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8,
  },
  chipText: { color: C.ink, fontWeight: "600", fontSize: 14 },
  badge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill },
  badgeText: { color: "white", fontWeight: "700", fontSize: 12 },
  button: { paddingVertical: 14, borderRadius: R.btn, alignItems: "center", marginTop: 10 },
  buttonText: { color: "white", fontWeight: "700", fontSize: 16 },
  banner: { padding: 12, borderRadius: R.btn, marginBottom: 14 },
  bannerText: { fontWeight: "600", fontSize: 14, lineHeight: 20 },
  steps: { flexDirection: "row", marginBottom: 14 },
  stepCol: { flex: 1, marginRight: 6 },
  stepBar: { height: 5, borderRadius: 3, backgroundColor: C.line, marginBottom: 6 },
  stepText: { fontSize: 11, color: C.sub },
  stat: { flex: 1, backgroundColor: C.neutralSoft, borderRadius: R.btn, padding: 10, marginRight: 8 },
  statValue: { fontSize: 16, fontWeight: "700", color: C.ink },
  statLabel: { fontSize: 11, color: C.sub, marginTop: 2 },
});
