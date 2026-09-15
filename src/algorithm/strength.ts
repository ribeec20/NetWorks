import type { Contact, Interaction, OngoingBuilder } from '../types'
import { WEIGHTS, DIRECT_THRESHOLD, SCORE_CURVE_EXPONENT } from './constants'
import { computeTenure } from './factors/tenure'
import { computeRecency } from './factors/recency'
import { computeFrequency } from './factors/frequency'
import { computeDepth } from './factors/depth'
import { computeBuilders } from './factors/builders'
import { applyDecay, daysSince } from './decay'

export interface StrengthResult {
  score: number
  factors: {
    tenure: number
    recency: number
    frequency: number
    depth: number
    builders: number
  }
  shouldTransitionToDirect: boolean
}

export function computeStrength(
  contact: Contact,
  interactions: Interaction[],
  builders: OngoingBuilder[],
  isDirect: boolean,
  now: number = Date.now(),
): StrengthResult {
  const tenure = computeTenure(contact.dateFirstMet, now)

  // Find the most recent interaction date
  const lastInteractionDate = interactions.length > 0
    ? Math.max(...interactions.map((i) => i.date))
    : null

  const recency = computeRecency(lastInteractionDate, tenure, now)
  const frequency = computeFrequency(interactions, now)
  const depth = computeDepth(interactions, now)
  const buildersScore = computeBuilders(builders, now)

  // Weighted composite (0-1), then apply power curve for logarithmic progression.
  // The exponent compresses the top end: getting from 70->80 requires
  // disproportionately more investment than 30->40.
  const rawComposite = (
    tenure * WEIGHTS.tenure +
    recency * WEIGHTS.recency +
    frequency * WEIGHTS.frequency +
    depth * WEIGHTS.depth +
    buildersScore * WEIGHTS.builders
  )
  const curvedScore = Math.pow(rawComposite, SCORE_CURVE_EXPONENT) * 100

  // Maturity ceiling: tenure gates the maximum achievable score.
  // A brand-new relationship can't score above ~50 no matter how intense
  // the first interactions are. There's no substitute for time.
  const maturity = 0.5 + 0.5 * tenure
  const rawScore = curvedScore * maturity

  // Apply decay
  const hasActiveBuilders = builders.some((b) => !b.endDate || b.endDate > now)
  const daysInactive = daysSince(lastInteractionDate, now)
  const score = Math.round(Math.min(100, Math.max(0, applyDecay(rawScore, daysInactive, tenure, hasActiveBuilders))))

  // Check referral → direct transition
  const shouldTransitionToDirect = !isDirect && score >= DIRECT_THRESHOLD

  return {
    score,
    factors: { tenure, recency, frequency, depth, builders: buildersScore },
    shouldTransitionToDirect,
  }
}
