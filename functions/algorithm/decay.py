import math

from algorithm.constants import MS_PER_DAY


def apply_decay(
    base_score: float,
    days_since_last_interaction: float,
    tenure_score: float,
    has_active_builders: bool,
) -> float:
    """Apply time-based decay. High tenure = slow decay. Active builders prevent decay.

    Tenure creates a grace period before decay begins at all. Long-established
    relationships have inertia — a 5-year colleague doesn't start fading after
    one missed week.
    """
    if has_active_builders:
        return base_score
    if days_since_last_interaction <= 0:
        return base_score

    # Grace period: tenure gates when decay begins, not just how fast
    grace_days = tenure_score * 60
    effective_days = max(0.0, days_since_last_interaction - grace_days)
    if effective_days == 0:
        return base_score

    # Half-life: 30 days (new contacts) to 180 days (long tenure)
    half_life = 30 + tenure_score * 150
    decay_factor = math.pow(0.5, effective_days / half_life)
    return base_score * decay_factor


def days_since(timestamp: int | None, now: int) -> float:
    """Days elapsed since a timestamp. Defaults to 365 if no timestamp."""
    if timestamp is None:
        return 365.0
    return max(0.0, (now - timestamp) / MS_PER_DAY)
