import React from "react";
import { StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";

type Pt = { lat: number; lng: number };

// Native (phone) version. The browser version is in RideMap.web.tsx.
export function RideMap({ pickup, drop }: { pickup: Pt; drop: Pt }) {
  const region = {
    latitude: (pickup.lat + drop.lat) / 2,
    longitude: (pickup.lng + drop.lng) / 2,
    latitudeDelta: Math.max(Math.abs(pickup.lat - drop.lat) * 2.5, 0.02),
    longitudeDelta: Math.max(Math.abs(pickup.lng - drop.lng) * 2.5, 0.02),
  };
  return (
    <MapView style={styles.map} region={region}>
      <Marker coordinate={{ latitude: pickup.lat, longitude: pickup.lng }} title="Pickup" pinColor="green" />
      <Marker coordinate={{ latitude: drop.lat, longitude: drop.lng }} title="Drop" pinColor="red" />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { height: 220, borderRadius: 12, marginVertical: 12 },
});
