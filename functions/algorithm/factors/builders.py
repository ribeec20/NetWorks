from typing import Any, List


def compute_builders(builders: List[Any], now: int) -> float:
    """Ongoing builders factor (0-1): active builders contribute passive strength.

    Sum of hoursPerWeek (default 1 if None), normalized so 5+ hrs/week = 1.0.
    Even low-intensity builders (1hr/week mentorship) contribute meaningfully.
    """
    active = [b for b in builders if not b.get("endDate") or b["endDate"] > now]

    if not active:
        return 0.0

    total_hours = sum(b.get("hoursPerWeek") or 1 for b in active)
    return min(total_hours / 5, 1.0)
