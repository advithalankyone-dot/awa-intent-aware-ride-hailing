import React from "react";
import { Text, View } from "react-native";

type Pt = { lat: number; lng: number };

// Browser version: embeds a free OpenStreetMap view (no API key needed).
// The marker shows the pickup point; the view is sized to include the drop point too.
export function RideMap({ pickup, drop }: { pickup: Pt; drop: Pt }) {
  const pad = 0.015;
  const left = Math.min(pickup.lng, drop.lng) - pad;
  const right = Math.max(pickup.lng, drop.lng) + pad;
  const bottom = Math.min(pickup.lat, drop.lat) - pad;
  const top = Math.max(pickup.lat, drop.lat) + pad;
  const src =
    `https://www.openstreetmap.org/export/embed.html?bbox=${left},${bottom},${right},${top}` +
    `&layer=mapnik&marker=${pickup.lat},${pickup.lng}`;
  return (
    <View style={{ marginVertical: 12 }}>
      {React.createElement("iframe", {
        src,
        style: { width: "100%", height: 220, border: 0, borderRadius: 12, pointerEvents: "none" },
        title: "Ride map",
      })}
      <Text style={{ color: "#666", marginTop: 4 }}>Marker = pickup point</Text>
    </View>
  );
}
