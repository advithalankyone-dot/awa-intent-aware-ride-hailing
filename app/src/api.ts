import { API_URL, Intent } from "./config";

export type RideStatus =
  | "requested" | "offered" | "committed" | "completed"
  | "cancelled_by_passenger" | "no_driver";

export type Ride = {
  id: string;
  passenger_id: string;
  driver_id: string | null;
  offered_to: string | null;
  pickup_lat: number;
  pickup_lng: number;
  drop_lat: number;
  drop_lng: number;
  intent: Intent;
  intent_reason: string | null;
  status: RideStatus;
  fare_estimate: number | null;
  match_score: number | null;
  pickup_eta_min: number | null;
  reassign_count: number;
  reassign_seconds: number | null;
};

async function call<T>(path: string, method: "GET" | "POST" = "GET", body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let detail = `${res.status}`;
    try { detail = (await res.json()).detail ?? detail; } catch { /* ignore */ }
    throw new Error(String(detail));
  }
  return res.json() as Promise<T>;
}

export const api = {
  requestRide: (b: {
    passenger_id: string; pickup_lat: number; pickup_lng: number;
    drop_lat: number; drop_lng: number; intent: Intent; intent_reason?: string;
  }) => call<Ride>("/rides", "POST", b),
  getRide: (id: string) => call<Ride>(`/rides/${id}`),
  passengerCancel: (id: string) => call<Ride>(`/rides/${id}/passenger-cancel`, "POST"),

  setDriverStatus: (id: string, is_online: boolean, lat?: number, lng?: number) =>
    call<{ ok: boolean }>(`/drivers/${id}/status`, "POST", { is_online, lat, lng }),
  driverCurrent: (id: string) => call<{ ride: Ride | null }>(`/drivers/${id}/current`),
  reliability: (id: string) => call<{ reliability: number }>(`/drivers/${id}/reliability`),
  accept: (rideId: string, driverId: string) =>
    call<Ride>(`/rides/${rideId}/accept`, "POST", { driver_id: driverId }),
  decline: (rideId: string, driverId: string) =>
    call<Ride>(`/rides/${rideId}/decline`, "POST", { driver_id: driverId }),
  driverCancel: (rideId: string, driverId: string) =>
    call<Ride>(`/rides/${rideId}/driver-cancel`, "POST", { driver_id: driverId }),
  complete: (rideId: string, driverId: string) =>
    call<Ride>(`/rides/${rideId}/complete`, "POST", { driver_id: driverId }),
};
