"""Baseline (nearest driver) vs intent-aware matching on simulated data.

Run:  python simulate.py            (no Supabase needed)

Model: every driver has a hidden true cancel probability. The platform only sees a
noisy history (accepted / completed counts), which feeds the reliability score.
A cancellation after acceptance costs the passenger RESEARCH_PENALTY_MIN minutes
(driver wasted time + re-matching). A time-sensitive ride succeeds if total
delay is within TARGET_WINDOW_MIN. All numbers are assumptions: change and re-run.
"""
import os
import random
import sys
from statistics import mean

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from matching import Candidate, rank_drivers  # noqa: E402
from reliability import reliability_score      # noqa: E402

N_DRIVERS = 8
N_RIDES = 3000
SHARE_TIME_SENSITIVE = 0.3
TARGET_WINDOW_MIN = 9.0
RESEARCH_PENALTY_MIN = 6.0
AREA = 0.08  # degrees (~9 km square)


def make_world(rng):
    drivers, true_cancel = [], {}
    for i in range(N_DRIVERS):
        p = rng.choice([0.03, 0.05, 0.08, 0.20, 0.30])           # hidden truth
        accepted = rng.randint(0, 80)
        completed = sum(rng.random() > p for _ in range(accepted))  # noisy history
        rel = reliability_score(accepted, completed)
        drivers.append(Candidate(f"d{i}", 20 + rng.random() * AREA, 77 + rng.random() * AREA, rel))
        true_cancel[f"d{i}"] = p
    return drivers, true_cancel


def run(intent_aware: bool, seed: int):
    rng = random.Random(seed)
    drivers, true_cancel = make_world(rng)
    rows = []
    for _ in range(N_RIDES):
        pickup = (20 + rng.random() * AREA, 77 + rng.random() * AREA)
        intent = "time_sensitive" if rng.random() < SHARE_TIME_SENSITIVE else "flexible"
        # pre-draw outcomes so both strategies face identical luck per ride/driver
        luck = {d.driver_id: rng.random() for d in drivers}
        exclude, delay, cancels = set(), 0.0, 0
        while True:
            ranked = rank_drivers(pickup, drivers, intent, intent_aware, exclude)
            if not ranked:
                break
            driver_id, _, eta = ranked[0]
            if luck[driver_id] < true_cancel[driver_id]:
                cancels += 1
                delay += RESEARCH_PENALTY_MIN
                exclude.add(driver_id)
                continue
            delay += eta
            break
        rows.append((intent, delay, cancels))
    return rows


def summarise(rows, label):
    ts = [r for r in rows if r[0] == "time_sensitive"]
    on_time = sum(1 for r in ts if r[1] <= TARGET_WINDOW_MIN) / len(ts)
    print(f"{label:<14} | time-sensitive on-time: {on_time:6.1%} | "
          f"avg wait (all): {mean(r[1] for r in rows):5.1f} min | "
          f"avg wait (urgent): {mean(r[1] for r in ts):5.1f} min | "
          f"cancels/ride: {mean(r[2] for r in rows):.3f}")


if __name__ == "__main__":
    for seed in (1, 2, 3, 4, 5):
        print(f"--- seed {seed} ---")
        summarise(run(False, seed), "baseline")
        summarise(run(True, seed), "intent-aware")
