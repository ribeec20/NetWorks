import type { InteractionType } from '../types'

export const WEIGHTS = {
  tenure: 0.20,
  recency: 0.25,
  frequency: 0.20,
  depth: 0.15,
  builders: 0.20,
} as const

export const DEPTH_MULTIPLIERS: Record<InteractionType, number> = {
  message: 1,
  email: 1,
  call: 2,
  video_call: 2,
  coffee_lunch: 3,
  meeting: 2.5,
  event: 1.5,
  collaboration: 4,
  other: 1,
}

export const MAX_DEPTH_MULTIPLIER = 4

export const DIRECT_THRESHOLD = 40

export const FREQUENCY_WINDOW_DAYS = 90

// Power curve exponent for logarithmic score progression.
// < 1.0 compresses high scores (harder to reach 90+, easier to reach 50).
export const SCORE_CURVE_EXPONENT = 0.7

// Tenure milestones in milliseconds
export const MS_PER_DAY = 86400000
export const MS_PER_YEAR = MS_PER_DAY * 365

// Max tenure contribution at 5 years
export const MAX_TENURE_YEARS = 5
