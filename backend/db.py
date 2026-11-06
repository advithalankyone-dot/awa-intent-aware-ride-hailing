"""Thin Supabase data layer. Keeps all SQL/table knowledge out of main.py."""
import os
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from supabase import Client, create_client

from matching import Candidate
from reliability import reliability_score

load_dotenv()

_client: Client | None = None
RECENT_DAYS = 30
MAX_TIME_SENSITIVE_PER_DAY = 3   # anti-gaming: extra requests are treated as "important"


def sb() -> Client:
    global _client
    if _client is None:
        url, key = os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"]
        _client = create_client(url, key)
    return _client


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_ride(ride_id: str) -> dict:
    return sb().table("rides").select("*").eq("id", ride_id).single().execute().data


def update_ride(ride_id: str, fields: dict) -> dict:
    return sb().table("rides").update(fields).eq("id", ride_id).execute().data[0]


def log_event(driver_id: str, ride_id: str, event_type: str) -> None:
    sb().table("driver_events").insert(
        {"driver_id": driver_id, "ride_id": ride_id, "event_type": event_type}
    ).execute()


def recent_counts(driver_id: str) -> tuple[int, int]:
    since = (datetime.now(timezone.utc) - timedelta(days=RECENT_DAYS)).isoformat()
    rows = (sb().table("driver_events").select("event_type")
            .eq("driver_id", driver_id).gte("created_at", since).execute().data)
    accepted = sum(1 for r in rows if r["event_type"] == "accept")
    cancelled = sum(1 for r in rows if r["event_type"] == "cancel_after_accept")
    return accepted, cancelled


def driver_reliability(driver_row: dict) -> float:
    ra, rc = recent_counts(driver_row["user_id"])
    return reliability_score(driver_row["accepted_rides"], driver_row["completed_rides"], ra, rc)


def available_candidates() -> list[Candidate]:
    rows = (sb().table("drivers").select("*")
            .eq("is_online", True).eq("is_busy", False).execute().data)
    return [
        Candidate(r["user_id"], r["lat"], r["lng"], driver_reliability(r))
        for r in rows if r["lat"] is not None and r["lng"] is not None
    ]


def time_sensitive_today(passenger_id: str) -> int:
    since = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    rows = (sb().table("rides").select("id").eq("passenger_id", passenger_id)
            .eq("intent", "time_sensitive").gte("created_at", since).execute().data)
    return len(rows)


def bump_driver(driver_id: str, accepted: int = 0, completed: int = 0, busy: bool | None = None) -> None:
    row = sb().table("drivers").select("*").eq("user_id", driver_id).single().execute().data
    fields = {
        "accepted_rides": row["accepted_rides"] + accepted,
        "completed_rides": row["completed_rides"] + completed,
    }
    if busy is not None:
        fields["is_busy"] = busy
    sb().table("drivers").update(fields).eq("user_id", driver_id).execute()
