import math

from algorithm.constants import MS_PER_YEAR, MAX_TENURE_YEARS


def compute_tenure(date_first_met: int, now: int) -> float:
    """Tenure factor (0-1): logarithmic curve over MAX_TENURE_YEARS.

    Front-loads early tenure — the jump from 'just met' to '1 year' matters
    more than year 3 to year 4.

      6 months -> 0.23  (was 0.10 linear)
      1 year   -> 0.39  (was 0.20)
      2 years  -> 0.61  (was 0.40)
      3 years  -> 0.77  (was 0.60)
      5 years  -> 1.00  (same)
    """
    elapsed = now - date_first_met
    if elapsed <= 0:
        return 0.0
    years = elapsed / MS_PER_YEAR
    capped = min(years, MAX_TENURE_YEARS)
    return math.log(capped + 1) / math.log(MAX_TENURE_YEARS + 1)
