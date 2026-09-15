WEIGHTS = {
    "tenure": 0.20,
    "recency": 0.25,
    "frequency": 0.20,
    "depth": 0.15,
    "builders": 0.20,
}

DEPTH_MULTIPLIERS = {
    "message": 1,
    "email": 1,
    "call": 2,
    "video_call": 2,
    "coffee_lunch": 3,
    "meeting": 2.5,
    "event": 1.5,
    "collaboration": 4,
    "other": 1,
}

MAX_DEPTH_MULTIPLIER = 4
DIRECT_THRESHOLD = 40

# Power curve exponent for logarithmic score progression.
# < 1.0 compresses high scores (harder to reach 90+, easier to reach 50).
SCORE_CURVE_EXPONENT = 0.7
FREQUENCY_WINDOW_DAYS = 90

MS_PER_DAY = 86_400_000
MS_PER_YEAR = MS_PER_DAY * 365
MAX_TENURE_YEARS = 5
