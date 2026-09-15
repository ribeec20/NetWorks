from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from algorithm.constants import WEIGHTS, DIRECT_THRESHOLD, SCORE_CURVE_EXPONENT
from algorithm.factors import (
    compute_tenure,
    compute_recency,
    compute_frequency,
    compute_depth,
    compute_builders,
)
from algorithm.decay import apply_decay, days_since


@dataclass
class StrengthResult:
    score: int
    factors: Dict[str, float]
    should_transition_to_direct: bool


def compute_strength(
    contact: Dict[str, Any],
    interactions: List[Dict[str, Any]],
    builders: List[Dict[str, Any]],
    is_direct: bool,
    now: int,
) -> StrengthResult:
    """Compute composite relationship strength (0-100) for a contact."""
    tenure = compute_tenure(contact["dateFirstMet"], now)

    # Most recent interaction date
    last_interaction_date: Optional[int] = None
    if interactions:
        last_interaction_date = max(i["date"] for i in interactions)

    recency = compute_recency(last_interaction_date, tenure, now)
    frequency = compute_frequency(interactions, now)
    depth = compute_depth(interactions, now)
    builders_score = compute_builders(builders, now)

    # Weighted composite (0-1), then apply power curve for logarithmic progression.
    # The exponent compresses the top end: getting from 70->80 requires
    # disproportionately more investment than 30->40.
    raw_composite = (
        tenure * WEIGHTS["tenure"]
        + recency * WEIGHTS["recency"]
        + frequency * WEIGHTS["frequency"]
        + depth * WEIGHTS["depth"]
        + builders_score * WEIGHTS["builders"]
    )
    curved_score = (raw_composite ** SCORE_CURVE_EXPONENT) * 100

    # Maturity ceiling: tenure gates the maximum achievable score.
    # A brand-new relationship can't score above ~50 no matter how intense
    # the first interactions are. There's no substitute for time.
    maturity = 0.5 + 0.5 * tenure
    raw_score = curved_score * maturity

    # Apply decay
    has_active_builders = any(
        not b.get("endDate") or b["endDate"] > now for b in builders
    )
    days_inactive = days_since(last_interaction_date, now)
    score = round(min(100, max(0, apply_decay(raw_score, days_inactive, tenure, has_active_builders))))

    should_transition = not is_direct and score >= DIRECT_THRESHOLD

    return StrengthResult(
        score=score,
        factors={
            "tenure": tenure,
            "recency": recency,
            "frequency": frequency,
            "depth": depth,
            "builders": builders_score,
        },
        should_transition_to_direct=should_transition,
    )
