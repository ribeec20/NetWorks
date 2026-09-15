import { MS_PER_DAY } from '../constants'

/**
 * Recency factor (0-1): half-life decay modulated by tenure, with grace period.
 *
 * Tenure creates a grace period before any decay begins. A 3-year relationship
 * (tenure=0.6) gets ~27 days grace — monthly check-ins barely register as gaps.
 *
 * After the grace period, half-life scales with tenure:
 *   Low tenure  -> half-life ~14 days (fast decay)
 *   High tenure -> half-life ~60 days (slow decay)
 */
export function computeRecency(
  lastInteractionDate: number | null,
  tenureScore: number,
  now: number = Date.now(),
): number {
  if (!lastInteractionDate) return 0

  const daysSinceLastInteraction = (now - lastInteractionDate) / MS_PER_DAY
  if (daysSinceLastInteraction <= 0) return 1

  // Grace period: established relationships don't decay immediately
  const graceDays = tenureScore * 45
  const effectiveDays = Math.max(0, daysSinceLastInteraction - graceDays)
  if (effectiveDays === 0) return 1

  const halfLife = 14 + tenureScore * 46
  return Math.pow(0.5, effectiveDays / halfLife)
}
