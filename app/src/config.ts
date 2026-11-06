// Edit the demo data below to match your campus / city. These ids match backend/schema.sql.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.1.5:8000";
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export type Place = { name: string; lat: number; lng: number };

export const PLACES: Place[] = [
  { name: "Main Gate", lat: 20.0, lng: 77.0 },
  { name: "Library", lat: 20.01, lng: 77.008 },
  { name: "Hostel Block", lat: 19.992, lng: 77.012 },
  { name: "Railway Station", lat: 20.03, lng: 77.03 },
  { name: "Airport", lat: 20.06, lng: 77.06 },
];

export const PASSENGER = { id: "11111111-1111-1111-1111-111111111111", name: "Demo Passenger" };

// Start positions match the seed rows in schema.sql
export const DRIVERS = [
  { id: "22222222-2222-2222-2222-000000000001", name: "Driver A (new)", lat: 20.004, lng: 77.003 },
  { id: "22222222-2222-2222-2222-000000000002", name: "Driver B (reliable)", lat: 20.02, lng: 77.01 },
  { id: "22222222-2222-2222-2222-000000000003", name: "Driver C (flaky)", lat: 20.002, lng: 77.001 },
  { id: "22222222-2222-2222-2222-000000000004", name: "Driver D (reliable)", lat: 19.99, lng: 77.015 },
  { id: "22222222-2222-2222-2222-000000000005", name: "Driver E (flaky)", lat: 20.001, lng: 76.999 },
];

export type Intent = "flexible" | "important" | "time_sensitive";

export const INTENT_OPTIONS: { value: Intent; label: string; hint: string; color: string }[] = [
  { value: "flexible", label: "Flexible", hint: "No rush. Closest driver is fine.", color: "#1F7A4D" },
  { value: "important", label: "Important", hint: "I need a dependable driver.", color: "#B7791F" },
  { value: "time_sensitive", label: "Time-sensitive", hint: "I must arrive on time.", color: "#C23B3B" },
];

// Name of the preset place closest to a coordinate (used to label routes).
export function placeName(lat: number, lng: number): string {
  let best = PLACES[0];
  let bestD = Infinity;
  for (const p of PLACES) {
    const d = (p.lat - lat) ** 2 + (p.lng - lng) ** 2;
    if (d < bestD) { bestD = d; best = p; }
  }
  return best.name;
}
