import React, { useState } from "react";
import { Image, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { DRIVERS, PASSENGER } from "./src/config";
import DriverScreen from "./src/screens/DriverScreen";
import PassengerScreen from "./src/screens/PassengerScreen";
import { C, FONT_SERIF, R } from "./src/theme";

const LOGO = require("./src/assets/logo.png");

type Profile = { role: "passenger" | "driver"; id: string; name: string } | null;

function Avatar({ name, color }: { name: string; color: string }) {
  return (
    <View style={[st.avatar, { backgroundColor: color }]}>
      <Text style={st.avatarText}>{name.replace("Driver ", "").charAt(0).toUpperCase()}</Text>
    </View>
  );
}

export default function App() {
  const [profile, setProfile] = useState<Profile>(null);

  return (
    <View style={st.root}>
      <StatusBar barStyle="dark-content" />

      <View style={st.topbar}>
        <View style={st.brand}>
          <Image source={LOGO} style={st.logoImg} />
          <Text style={st.logo}>Awa</Text>
        </View>
        {profile && (
          <TouchableOpacity style={st.userPill} onPress={() => setProfile(null)}>
            <Text style={st.userPillText}>{profile.name}  |  Switch</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={st.body}>
      {!profile ? (
        <ScrollView contentContainerStyle={st.pad}>
          <View style={st.hero}>
            <Image source={LOGO} style={st.heroImg} />
          </View>
          <Text style={st.h1}>Who's using Awa?</Text>
          <Text style={st.sub}>Intent-aware ride-hailing. Demo login: open one window or device per person.</Text>

          <Text style={st.section}>PASSENGER</Text>
          <TouchableOpacity style={st.option} onPress={() => setProfile({ role: "passenger", ...PASSENGER })}>
            <Avatar name={PASSENGER.name} color={C.brand} />
            <View>
              <Text style={st.optionTitle}>{PASSENGER.name}</Text>
              <Text style={st.optionSub}>Book rides and choose how important the trip is</Text>
            </View>
          </TouchableOpacity>

          <Text style={st.section}>DRIVERS</Text>
          {DRIVERS.map((d) => (
            <TouchableOpacity key={d.id} style={st.option} onPress={() => setProfile({ role: "driver", id: d.id, name: d.name })}>
              <Avatar name={d.name} color={C.green} />
              <View>
                <Text style={st.optionTitle}>{d.name}</Text>
                <Text style={st.optionSub}>Accept, complete or cancel rides</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : profile.role === "passenger" ? (
        <PassengerScreen />
      ) : (
        <DriverScreen key={profile.id} driverId={profile.id} name={profile.name} />
      )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: C.bg, width: "100%", maxWidth: 480,
    // On the web the page needs an explicit height, otherwise the ScrollView never scrolls.
    ...(Platform.OS === "web" ? ({ height: "100vh", marginLeft: "auto", marginRight: "auto" } as any) : {}),
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : Platform.OS === "ios" ? 50 : 0,
  },
  topbar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.card,
    borderBottomWidth: 1, borderBottomColor: C.line,
  },
  // Fixed-height scroll area on the web (viewport minus the top bar), so the page always scrolls.
  body: {
    flex: 1,
    ...(Platform.OS === "web" ? ({ height: "calc(100vh - 60px)", overflow: "auto" } as any) : {}),
  },
  brand: { flexDirection: "row", alignItems: "center" },
  logoImg: { width: 34, height: 34, marginRight: 8 },
  logo: { fontSize: 26, fontWeight: "700", color: C.ink, fontFamily: FONT_SERIF },
  hero: { alignItems: "center", marginBottom: 16 },
  heroImg: { width: 150, height: 150 },
  userPill: { backgroundColor: C.brandSoft, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 6 },
  userPillText: { color: C.brandDark, fontWeight: "600", fontSize: 13 },
  pad: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 28, fontWeight: "700", color: C.ink, fontFamily: FONT_SERIF },
  sub: { color: C.sub, marginTop: 4 },
  section: { fontWeight: "700", fontSize: 12, color: C.sub, letterSpacing: 0.5, marginTop: 22, marginBottom: 8 },
  option: {
    flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderWidth: 1, borderColor: C.line,
    borderRadius: R.card, padding: 12, marginBottom: 8,
  },
  optionTitle: { fontSize: 16, fontWeight: "700", color: C.ink },
  optionSub: { fontSize: 12, color: C.sub, marginTop: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginRight: 12 },
  avatarText: { color: "white", fontWeight: "800", fontSize: 16 },
});
