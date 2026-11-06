import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api, Ride } from "../api";
import { notify } from "../dialog";
import { Banner, Button, Card, Chip, IntentBadge, Label, RideMap, Stat, Steps } from "../components";
import { DRIVERS, INTENT_OPTIONS, Intent, PASSENGER, PLACES, Place } from "../config";
import { useLive } from "../live";
import { nearestPlaceName } from "../places";
import { C, FONT_SERIF } from "../theme";

const INTENT_HINT: Record<Intent, string> = {
  flexible: "Any nearby driver is fine. The closest one is picked.",
  important: "Matching also favours reliable drivers.",
  time_sensitive: "Strongest weight on reliability and short pickup time.",
};

const driverName = (id: string | null) => DRIVERS.find((d) => d.id === id)?.name ?? null;

function PlaceChips(props: { value: Place; onChange: (p: Place) => void }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {PLACES.map((p) => (
        <Chip key={p.name} label={p.name} selected={props.value.name === p.name} onPress={() => props.onChange(p)} />
      ))}
    </View>
  );
}

export default function PassengerScreen() {
  const [pickup, setPickup] = useState<Place>(PLACES[0]);
  const [drop, setDrop] = useState<Place>(PLACES[3]);
  const [intent, setIntent] = useState<Intent>("flexible");
  const [reason, setReason] = useState("");
  const [rideId, setRideId] = useState<string | null>(null);
  const [ride, setRide] = useState<Ride | null>(null);
  const [busy, setBusy] = useState(false);

  const refetch = useCallback(async () => {
    if (!rideId) return;
    try { setRide(await api.getRide(rideId)); } catch { /* keep last known state */ }
  }, [rideId]);
  useLive(refetch);

  const book = async () => {
    if (pickup.name === drop.name) return notify("Pick different pickup and drop locations");
    setBusy(true);
    try {
      const r = await api.requestRide({
        passenger_id: PASSENGER.id,
        pickup_lat: pickup.lat, pickup_lng: pickup.lng,
        drop_lat: drop.lat, drop_lng: drop.lng,
        intent, intent_reason: reason.trim() || undefined,
      });
      setRideId(r.id);
      setRide(r);
    } catch (e) {
      notify("Could not book", String(e));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => { setRideId(null); setRide(null); setReason(""); };

  // ---------- booking form ----------
  if (!ride) {
    return (
      <ScrollView contentContainerStyle={st.pad}>
        <Text style={st.h1}>Where to?</Text>
        <Text style={st.sub}>Tell us how important the trip is and we match the right driver.</Text>

        <Card>
          <Label>PICKUP</Label>
          <PlaceChips value={pickup} onChange={setPickup} />
          <Label>DROP</Label>
          <PlaceChips value={drop} onChange={setDrop} />
          <RideMap pickup={pickup} drop={drop} />
        </Card>

        <Card>
          <Label>HOW IMPORTANT IS THIS TRIP?</Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {INTENT_OPTIONS.map((o) => (
              <Chip key={o.value} label={o.label} color={o.color} selected={intent === o.value} onPress={() => setIntent(o.value)} />
            ))}
          </View>
          <Text style={st.hint}>{INTENT_HINT[intent]}</Text>
          {intent !== "flexible" && (
            <>
              <TextInput
                style={st.input}
                placeholder="Short reason, e.g. Flight at 8:30 PM (optional)"
                placeholderTextColor={C.sub}
                value={reason}
                onChangeText={setReason}
                maxLength={80}
              />
              <Text style={st.hint}>Keep it short. Please don't share medical or financial details.</Text>
            </>
          )}
        </Card>

        <Button label={busy ? "Booking..." : "Request ride"} onPress={book} disabled={busy} />
      </ScrollView>
    );
  }

  // ---------- ride status ----------
  const reassigned = ride.reassign_count > 0;
  const active = ["requested", "offered", "committed"].includes(ride.status);
  const step = ride.status === "requested" ? 0 : ride.status === "offered" ? 1 : ride.status === "committed" ? 2 : 3;
  const offeredName = driverName(ride.offered_to);
  const assignedName = driverName(ride.driver_id);

  return (
    <ScrollView contentContainerStyle={st.pad}>
      <Text style={st.h1}>Your ride</Text>

      <Card>
        <View style={st.rowBetween}>
          <IntentBadge intent={ride.intent} />
          {ride.fare_estimate != null && <Text style={st.fare}>Rs {ride.fare_estimate}</Text>}
        </View>
        <Text style={st.route}>
          {nearestPlaceName(ride.pickup_lat, ride.pickup_lng)}  to  {nearestPlaceName(ride.drop_lat, ride.drop_lng)}
        </Text>
        {ride.intent_reason ? <Text style={st.reason}>"{ride.intent_reason}"</Text> : null}
        <RideMap
          pickup={{ lat: ride.pickup_lat, lng: ride.pickup_lng }}
          drop={{ lat: ride.drop_lat, lng: ride.drop_lng }}
        />
      </Card>

      {active || ride.status === "completed" ? <Steps current={step} /> : null}

      {ride.status === "requested" && <Banner tone="info" text="Finding you a driver..." />}
      {ride.status === "offered" && (
        <Banner
          tone={reassigned ? "danger" : "info"}
          text={reassigned
            ? `Your driver cancelled. We're finding you a new driver. Your booking is kept.${offeredName ? ` Request sent to ${offeredName}.` : ""}`
            : `Request sent${offeredName ? ` to ${offeredName}` : ""}. Waiting for them to accept.`}
        />
      )}
      {ride.status === "committed" && (
        <Banner
          tone="success"
          text={`${assignedName ?? "A driver"} accepted${ride.pickup_eta_min != null ? ` - about ${Math.round(ride.pickup_eta_min)} min away` : ""}.` +
            (reassigned ? " (New driver after a cancellation.)" : "")}
        />
      )}
      {ride.status === "completed" && <Banner tone="success" text="Ride completed. Thank you!" />}
      {ride.status === "no_driver" && <Banner tone="danger" text="No driver is available right now. Please try again shortly." />}
      {ride.status === "cancelled_by_passenger" && <Banner tone="neutral" text="Ride cancelled." />}

      {(ride.match_score != null || reassigned) && (
        <Card>
          <Label>WHY THIS MATCH</Label>
          <View style={{ flexDirection: "row" }}>
            {ride.match_score != null && <Stat label="Match score" value={ride.match_score.toFixed(2)} />}
            {ride.pickup_eta_min != null && <Stat label="Pickup (min)" value={String(Math.round(ride.pickup_eta_min))} />}
            <Stat label="Reassignments" value={String(ride.reassign_count)} />
          </View>
          <Text style={st.hint}>
            Score combines pickup time and driver reliability, weighted for a {INTENT_OPTIONS.find((o) => o.value === ride.intent)?.label} trip.
            {ride.reassign_seconds != null ? ` Last reassignment took ${Math.round(ride.reassign_seconds)} s.` : ""}
          </Text>
        </Card>
      )}
      <Text style={st.hint}>Arrival times are estimates, not guarantees.</Text>

      {active ? (
        <Button label="Cancel ride" variant="danger" onPress={async () => { await api.passengerCancel(ride.id); refetch(); }} />
      ) : (
        <Button label="Book another ride" onPress={reset} />
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 28, fontWeight: "700", color: C.ink, fontFamily: FONT_SERIF },
  sub: { color: C.sub, marginTop: 4, marginBottom: 16, lineHeight: 20 },
  hint: { color: C.sub, marginTop: 8, fontSize: 13, lineHeight: 18 },
  input: {
    borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 12, marginTop: 10,
    color: C.ink, backgroundColor: C.neutralSoft,
  },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fare: { fontSize: 18, fontWeight: "800", color: C.ink },
  route: { fontSize: 18, fontWeight: "700", color: C.ink, marginTop: 10 },
  reason: { marginTop: 6, fontStyle: "italic", color: C.sub },
});
