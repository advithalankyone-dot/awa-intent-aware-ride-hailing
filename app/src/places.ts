import { PLACES } from "./config";

// Name of the preset place closest to a coordinate (used to show "Main Gate to Airport").
export function nearestPlaceName(lat: number, lng: number): string {
  let best = PLACES[0];
  let bestD = Infinity;
  for (const p of PLACES) {
    const d = (p.lat - lat) ** 2 + (p.lng - lng) ** 2;
    if (d < bestD) { bestD = d; best = p; }
  }
  return best.name;
}
