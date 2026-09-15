import math
from typing import Any, List

from algorithm.constants import MS_PER_DAY, FREQUENCY_WINDOW_DAYS


def compute_frequency(interactions: List[Any], now: int) -> float:
    """Frequency factor (0-1): interaction count in 90-day window.

    6+ interactions (biweekly+) = 1.0, logarithmic scaling below that.
    Monthly cadence (~3 in 90 days) scores ~0.70 instead of being penalized.
    """
    window_start = now - FREQUENCY_WINDOW_DAYS * MS_PER_DAY
    recent_count = sum(1 for i in interactions if i["date"] >= window_start)

    if recent_count == 0:
        return 0.0
    if recent_count >= 6:
        return 1.0

    return math.log(recent_count + 1) / math.log(7)
