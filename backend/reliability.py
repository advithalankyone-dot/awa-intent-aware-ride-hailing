"""Driver reliability score (0..1). Used as ONE matching signal, never as a ban.

Design choices (from sections 7 and 13 of the proposal):
- Cold start: new drivers get a neutral score via a Bayesian prior.
- Not permanent: recent behaviour counts, and old cancellations fade out of the window.
- Smooth: one cancellation cannot wreck a driver with a long record.
"""

PRIOR_SCORE = 0.80      # assumed completion rate for a driver with no history
PRIOR_WEIGHT = 10       # "virtual rides" backing the prior; bigger = slower to move
RECENT_WEIGHT = 0.35    # how much recent behaviour counts vs lifetime record
RECENT_PRIOR_WEIGHT = 5


def _smoothed_rate(successes: int, total: int, prior: float, prior_weight: float) -> float:
    return (successes + prior * prior_weight) / (total + prior_weight)


def reliability_score(
    accepted_rides: int,
    completed_rides: int,
    recent_accepted: int = 0,
    recent_cancelled: int = 0,
) -> float:
    """Combine lifetime completion rate with recent (e.g. last 30 days) behaviour."""
    lifetime = _smoothed_rate(completed_rides, accepted_rides, PRIOR_SCORE, PRIOR_WEIGHT)
    recent_completed = max(recent_accepted - recent_cancelled, 0)
    recent = _smoothed_rate(recent_completed, recent_accepted, lifetime, RECENT_PRIOR_WEIGHT)
    score = (1 - RECENT_WEIGHT) * lifetime + RECENT_WEIGHT * recent
    return round(min(max(score, 0.0), 1.0), 4)
