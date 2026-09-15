import math
from typing import Optional

from algorithm.constants import MS_PER_DAY


def compute_recency(
    last_interaction_date: Optional[int],
    tenure_score: float,
    now: int,
) -> float:
    """Recency factor (0-1): half-life decay modulated by tenure, with grace period.

    Tenure creates a grace period before any decay begins. A 3-year relationship
    (tenure=0.6) gets ~27 days grace — monthly check-ins barely register as gaps.

    After the grace period, half-life scales with tenure:
      Low tenure  -> half-life ~14 days (fast decay)
      High tenure -> half-life ~60 days (slow decay)
    """
    if last_interaction_date is None:
        return 0.0

    days_since = (now - last_interaction_date) / MS_PER_DAY
    if days_since <= 0:
        return 1.0

    # Grace period: established relationships don't decay immediately
    grace_days = tenure_score * 45
    effective_days = max(0.0, days_since - grace_days)
    if effective_days == 0:
        return 1.0

    half_life = 14 + tenure_score * 46
    return math.pow(0.5, effective_days / half_life)
