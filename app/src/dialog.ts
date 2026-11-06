import { Alert, Platform } from "react-native";

// Alert.alert with buttons does nothing in a browser, so use window.alert/confirm on web.
const w: any = globalThis;

export function notify(title: string, message?: string) {
  if (Platform.OS === "web") {
    w.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

export function confirmAction(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (w.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Keep ride", style: "cancel" },
    { text: confirmLabel, style: "destructive", onPress: onConfirm },
  ]);
}
