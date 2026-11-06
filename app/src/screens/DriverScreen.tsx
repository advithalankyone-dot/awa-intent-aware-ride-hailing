import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { api, Ride } from "../api";
import { confirmAction, notify } from "../dialog";
import { Banner, Button, Card, IntentBadge, Label, RideMap, Stat } from "../components";
import { DRIVERS } from "../config";
import { useLive } from "../live";
import { nearestPlaceName } from "../places";
import { C, FONT_SERIF } from "../theme";

export default function DriverScreen({ driverId, name }: { driverId: string; name: string }) {
  const [online, setOnline] = useState(false);
  const [ride, setRide] = useState<Ride | null>(null);
  const [reliability, setReliability] = useState<number | null>(null);
  const me = DRIVERS.find((d) => d.id === driverId)!;

  const refetch = useCallback(async () => {
    try {
      const { ride } = await api.driverCurrent(driverId);
      setRide(ride);
      setReliability((await api.reliability(driverId)).reliability);
    } catch { /* keep last known state */ }
  }, [driverId]);
  useLive(refetch);

  useEffect(() => { api.reliability(driverId).then((r) => setReliability(r.reliability)).catch(() => {}); }, [driverId]);

  const toggleOnline = async (value: boolean) => {
    setOnline(value);
    try { await api.setDriverStatus(driverId, value, me.lat, me.lng); }
    catch (e) { setOnline(!value); notify("Could not change status", String(e)); }
  };

  const act = async (fn: () => Promise<unknown>) => {
    try { await fn(); } catch (e) { notify("Action failed", String(e)); }
    refetch();
  };

  const offered = ride && ride.status === "offered" && ride.offered_to === driverId;
  const committed = ride && ride.status === "committed" && ride.driver_id === driverId;
  const pct = reliability != null ? Math.round(reliability * 100) : 0;
  const meterColor = pct >= 85 ? C.green : pct >= 70 ? C.amber : C.red;

  return (
    <ScrollView contentContainerStyle={st.pad}>
      <Text style={st.h1}>{name}</Text>

      <Card>
        <View style={st.rowBetween}>
          <View>
            <Text style={st.status}>{online ? "You're online" : "You're offline"}</Text>
            <Text style={st.hint}>{online ? "Ride requests will appear here." : "Go online to receive requests."}</Text>
          </View>
          <Switch value={online} onValueChange={toggleOnline} />
        </View>

        <Label>RELIABILITY SCORE</Label>
        <View style={st.meterTrack}>
          <View style={[st.meterFill, { width: `${pct}%` as any, backgroundColor: meterColor }]} />
        </View>
        <Text style={st.hint}>
          {reliability != null ? reliability.toFixed(2) : "..."} - one signal in matching. Completing rides raises it; cancelling after accepting lowers it.
        </Text>
      </Card>

      {!ride && <Banner tone="neutral" text={online ? "Waiting for ride requests..." : "Offline"} />}

      {ride && (
        <Card>
          <View style={st.rowBetween}>
            <IntentBadge intent={ride.intent} />
            <Text style={st.fare}>Rs {ride.fare_estimate}</Text>
          </View>
          <Text style={st.route}>
            {nearestPlaceName(ride.pickup_lat, ride.pickup_lng)}  to  {nearestPlaceName(ride.drop_lat, ride.drop_lng)}
          </Text>
          {ride.intent_reason ? <Text style={st.reason}>"{ride.intent_reason}"</Text> : null}
          <View style={{ flexDirection: "row", marginTop: 12 }}>
            <Stat label="Pickup (min)" value={ride.pickup_eta_min != null ? String(Math.round(ride.pickup_eta_min)) : "?"} />
            <Stat label="Match score" value={ride.match_score != null ? ride.match_score.toFixed(2) : "-"} />
          </View>
          <RideMap
            pickup={{ lat: ride.pickup_lat, lng: ride.pickup_lng }}
            drop={{ lat: ride.drop_lat, lng: ride.drop_lng }}
          />

          {offered && (
            <>
              <Button label="Accept" variant="success" onPress={() => act(() => api.accept(ride.id, driverId))} />
              <Button label="Decline" variant="ghost" onPress={() => act(() => api.decline(ride.id, driverId))} />
            </>
          )}
          {committed && (
            <>
              <Banner tone="success" text="You accepted this ride. The passenger is counting on you." />
              <Button label="Complete ride" variant="success" onPress={() => act(() => api.complete(ride.id, driverId))} />
              <Button
                label="Cancel ride (recorded)"
                variant="danger"
                onPress={() =>
                  confirmAction(
                    "Cancel this ride?",
                    "The passenger will be reassigned and the cancellation is recorded. Genuine emergencies happen.",
                    "Cancel ride",
                    () => act(() => api.driverCancel(ride.id, driverId))
                  )
                }
              />
            </>
          )}
        </Card>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 28, fontWeight: "700", color: C.ink, marginBottom: 14, fontFamily: FONT_SERIF },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  status: { fontSize: 17, fontWeight: "700", color: C.ink },
  hint: { color: C.sub, marginTop: 6, fontSize: 13, lineHeight: 18 },
  meterTrack: { height: 8, borderRadius: 4, backgroundColor: C.line, overflow: "hidden" },
  meterFill: { height: 8, borderRadius: 4 },
  fare: { fontSize: 18, fontWeight: "800", color: C.ink },
  route: { fontSize: 18, fontWeight: "700", color: C.ink, marginTop: 10 },
  reason: { marginTop: 6, fontStyle: "italic", color: C.sub },
});
