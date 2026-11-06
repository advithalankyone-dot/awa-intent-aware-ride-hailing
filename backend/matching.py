"""Rule-based matching engine: baseline (nearest driver) vs intent-aware.

Match score = w_eta * eta_component + w_rel * reliability_component
            + w_fare * fare_component + w_urg * urgency_compatibility
All components are normalised to 0..1 (higher is better). The weights are
experimental parameters: tune them with sim/simulate.py, don't treat them as truth.
"""
from dataclasses import dataclass
from math import asin, cos, radians, sin, sqrt

AVG_SPEED_KMH = 25.0          # city traffic assumption for ETA
MAX_ETA_MIN = 30.0            # ETAs at or beyond this score 0

INTENTS = ("flexible", "important", "time_sensitive")

# weights per intent: (eta, reliability, fare_pref, urgency_compat)
WEIGHTS = {
    "flexible":       (0.70, 0.10, 0.10, 0.10),
    "important":      (0.45, 0.35, 0.10, 0.10),
    "time_sensitive": (0.50, 0.35, 0.00, 0.15),
}


@dataclass
class Candidate:
    driver_id: str
    lat: float
    lng: float
    reliability: float


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    dlat, dlng = radians(lat2 - lat1), radians(lng2 - lng1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
    return 2 * r * asin(sqrt(a))


def eta_minutes(distance_km: float) -> float:
    return distance_km / AVG_SPEED_KMH * 60.0


def estimate_fare(pickup: tuple, drop: tuple) -> float:
    """Simple INR fare: base + per-km. Replace with real pricing if you like."""
    km = haversine_km(pickup[0], pickup[1], drop[0], drop[1])
    return round(30 + 12 * km, 2)


def score_driver(intent: str, eta_min: float, reliability: float) -> float:
    w_eta, w_rel, w_fare, w_urg = WEIGHTS[intent]
    eta_c = max(0.0, 1.0 - eta_min / MAX_ETA_MIN)
    fare_c = 0.5  # neutral: driver preference is not modelled in the prototype
    # urgency compatibility: a reliable AND close driver suits an urgent ride best
    urg_c = reliability * eta_c if intent != "flexible" else 0.5
    return w_eta * eta_c + w_rel * reliability + w_fare * fare_c + w_urg * urg_c


def rank_drivers(pickup: tuple, candidates: list, intent: str = "flexible",
                 intent_aware: bool = True, exclude: set = frozenset()) -> list:
    """Return [(driver_id, score, eta_min)] best-first.

    intent_aware=False is the baseline: nearest driver wins.
    """
    if intent not in INTENTS:
        intent = "flexible"
    ranked = []
    for c in candidates:
        if c.driver_id in exclude:
            continue
        eta = eta_minutes(haversine_km(pickup[0], pickup[1], c.lat, c.lng))
        if intent_aware:
            s = score_driver(intent, eta, c.reliability)
        else:
            s = max(0.0, 1.0 - eta / MAX_ETA_MIN)
        ranked.append((c.driver_id, round(s, 4), round(eta, 2)))
    ranked.sort(key=lambda t: t[1], reverse=True)
    return ranked
