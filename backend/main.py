"""FastAPI service: ride requests, accept/decline, cancel-and-reassign, stats.

Run from this folder:  uvicorn main:app --reload --host 0.0.0.0 --port 8000
The Expo app talks to these endpoints and subscribes to the `rides` table via Supabase Realtime.
"""
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import db
from matching import INTENTS, estimate_fare, rank_drivers

app = FastAPI(title="Intent-Aware Ride-Hailing")
app.add_middleware(CORSMiddleware, allow_origins=["https://awa-intent-aware-ride-hailing-app.vercel.app", "http://localhost:8081"], allow_methods=["*"], allow_headers=["*"])


# ---------- request bodies ----------
class RideRequest(BaseModel):
    passenger_id: str
    pickup_lat: float
    pickup_lng: float
    drop_lat: float
    drop_lng: float
    intent: str = "flexible"
    intent_reason: str | None = Field(default=None, max_length=80)  # optional, short, non-sensitive


class DriverAction(BaseModel):
    driver_id: str


class DriverStatus(BaseModel):
    is_online: bool
    lat: float | None = None
    lng: float | None = None


# ---------- core: offer a ride to the best remaining driver ----------
def offer_to_next_driver(ride: dict) -> dict:
    """Rank available drivers (excluding ones who already declined/cancelled) and offer to the best."""
    pickup = (ride["pickup_lat"], ride["pickup_lng"])
    exclude = set(ride["excluded_driver_ids"] or [])
    ranked = rank_drivers(pickup, db.available_candidates(), ride["intent"],
                          intent_aware=True, exclude=exclude)
    if not ranked:
        return db.update_ride(ride["id"], {"status": "no_driver", "offered_to": None, "driver_id": None})
    driver_id, score, eta = ranked[0]
    return db.update_ride(ride["id"], {
        "status": "offered", "offered_to": driver_id, "driver_id": None,
        "match_score": score, "pickup_eta_min": eta,
    })


def drop_driver_from_ride(ride: dict, driver_id: str) -> dict:
    excluded = list(ride["excluded_driver_ids"] or [])
    if driver_id not in excluded:
        excluded.append(driver_id)
    return db.update_ride(ride["id"], {"excluded_driver_ids": excluded})


# ---------- endpoints ----------
@app.get("/health")
def health():
    return {"ok": True}


@app.get("/rides/{ride_id}")
def read_ride(ride_id: str):
    return db.get_ride(ride_id)


@app.get("/drivers/{driver_id}/current")
def driver_current(driver_id: str):
    """The ride currently offered to this driver, or the one they are committed to."""
    rows = (db.sb().table("rides").select("*")
            .or_(f"offered_to.eq.{driver_id},driver_id.eq.{driver_id}")
            .in_("status", ["offered", "committed"])
            .order("created_at", desc=True).limit(1).execute().data)
    return {"ride": rows[0] if rows else None}


@app.post("/rides")
def request_ride(req: RideRequest):
    intent = req.intent if req.intent in INTENTS else "flexible"
    # anti-gaming: unlimited top priority is not allowed
    if intent == "time_sensitive" and db.time_sensitive_today(req.passenger_id) >= db.MAX_TIME_SENSITIVE_PER_DAY:
        intent = "important"
    ride = db.sb().table("rides").insert({
        "passenger_id": req.passenger_id,
        "pickup_lat": req.pickup_lat, "pickup_lng": req.pickup_lng,
        "drop_lat": req.drop_lat, "drop_lng": req.drop_lng,
        "intent": intent, "intent_reason": req.intent_reason,
        "fare_estimate": estimate_fare((req.pickup_lat, req.pickup_lng), (req.drop_lat, req.drop_lng)),
    }).execute().data[0]
    return offer_to_next_driver(ride)


@app.post("/rides/{ride_id}/accept")
def accept_ride(ride_id: str, body: DriverAction):
    ride = db.get_ride(ride_id)
    if ride["status"] != "offered" or ride["offered_to"] != body.driver_id:
        raise HTTPException(409, "This ride is not currently offered to you")
    now = datetime.now(timezone.utc)
    fields = {"status": "committed", "driver_id": body.driver_id, "offered_to": None,
              "accepted_at": now.isoformat()}
    if ride["reassign_started_at"]:  # this acceptance ends a reassignment
        started = datetime.fromisoformat(ride["reassign_started_at"])
        fields["reassign_seconds"] = (now - started).total_seconds()
        fields["reassign_started_at"] = None
    db.log_event(body.driver_id, ride_id, "accept")
    db.bump_driver(body.driver_id, accepted=1, busy=True)
    return db.update_ride(ride_id, fields)


@app.post("/rides/{ride_id}/decline")
def decline_ride(ride_id: str, body: DriverAction):
    ride = db.get_ride(ride_id)
    if ride["status"] != "offered" or ride["offered_to"] != body.driver_id:
        raise HTTPException(409, "This ride is not currently offered to you")
    db.log_event(body.driver_id, ride_id, "decline")  # declines are NOT counted against reliability
    ride = drop_driver_from_ride(ride, body.driver_id)
    return offer_to_next_driver(ride)


@app.post("/rides/{ride_id}/driver-cancel")
def driver_cancel(ride_id: str, body: DriverAction):
    """The key feature: cancel after acceptance -> record it -> reassign, passenger keeps the booking."""
    ride = db.get_ride(ride_id)
    if ride["status"] != "committed" or ride["driver_id"] != body.driver_id:
        raise HTTPException(409, "You have no committed ride with this id")
    db.log_event(body.driver_id, ride_id, "cancel_after_accept")
    db.bump_driver(body.driver_id, busy=False)
    ride = drop_driver_from_ride(ride, body.driver_id)
    ride = db.update_ride(ride_id, {
        "reassign_count": ride["reassign_count"] + 1,
        "reassign_started_at": db.now_iso(),
        "status": "requested", "driver_id": None,
    })
    return offer_to_next_driver(ride)  # same ride id, same intent/priority


@app.post("/rides/{ride_id}/complete")
def complete_ride(ride_id: str, body: DriverAction):
    ride = db.get_ride(ride_id)
    if ride["status"] != "committed" or ride["driver_id"] != body.driver_id:
        raise HTTPException(409, "You have no committed ride with this id")
    db.log_event(body.driver_id, ride_id, "complete")
    db.bump_driver(body.driver_id, completed=1, busy=False)
    return db.update_ride(ride_id, {"status": "completed", "completed_at": db.now_iso()})


@app.post("/rides/{ride_id}/passenger-cancel")
def passenger_cancel(ride_id: str):
    ride = db.get_ride(ride_id)
    if ride["driver_id"]:
        db.bump_driver(ride["driver_id"], busy=False)
    return db.update_ride(ride_id, {"status": "cancelled_by_passenger",
                                    "offered_to": None, "driver_id": None})


@app.post("/drivers/{driver_id}/status")
def set_driver_status(driver_id: str, body: DriverStatus):
    fields = {"is_online": body.is_online}
    if body.lat is not None and body.lng is not None:
        fields.update({"lat": body.lat, "lng": body.lng})
    db.sb().table("drivers").update(fields).eq("user_id", driver_id).execute()
    return {"ok": True}


@app.get("/drivers/{driver_id}/reliability")
def get_reliability(driver_id: str):
    row = db.sb().table("drivers").select("*").eq("user_id", driver_id).single().execute().data
    return {"driver_id": driver_id, "reliability": db.driver_reliability(row)}


@app.get("/admin/stats")
def admin_stats():
    rides = db.sb().table("rides").select("*").execute().data
    events = db.sb().table("driver_events").select("event_type").execute().data
    accepts = sum(1 for e in events if e["event_type"] == "accept")
    cancels = sum(1 for e in events if e["event_type"] == "cancel_after_accept")
    completed = [r for r in rides if r["status"] == "completed"]
    reassigns = [r["reassign_seconds"] for r in rides if r["reassign_seconds"] is not None]
    return {
        "total_rides": len(rides),
        "active_rides": sum(1 for r in rides if r["status"] in ("requested", "offered", "committed")),
        "completed_rides": len(completed),
        "driver_cancellation_rate": round(cancels / accepts, 3) if accepts else 0,
        "avg_reassignment_seconds": round(sum(reassigns) / len(reassigns), 1) if reassigns else None,
        "rides_no_driver": sum(1 for r in rides if r["status"] == "no_driver"),
    }
