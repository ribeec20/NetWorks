from typing import Any, List

from algorithm.constants import (
    DEPTH_MULTIPLIERS,
    FREQUENCY_WINDOW_DAYS,
    MAX_DEPTH_MULTIPLIER,
    MS_PER_DAY,
)


def compute_depth(interactions: List[Any], now: int) -> float:
    """Depth factor (0-1): average depth multiplier of recent interactions."""
    window_start = now - FREQUENCY_WINDOW_DAYS * MS_PER_DAY
    recent = [i for i in interactions if i["date"] >= window_start]

    if not recent:
        return 0.0

    total_depth = sum(DEPTH_MULTIPLIERS.get(i["type"], 1) for i in recent)
    avg_depth = total_depth / len(recent)
    return min(avg_depth / MAX_DEPTH_MULTIPLIER, 1.0)
