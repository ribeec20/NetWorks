import { MS_PER_DAY } from './constants'

/**
 * Apply time-based decay to a base score.
 * High tenure = slow decay. Active builders prevent decay entirely.
 *
 * Tenure creates a grace period before decay begins at all. Long-established
 * relationships have inertia — a 5-year colleague doesn't start fading after
 * one missed week.
 */
export function applyDecay(
  baseScore: number,
  daysSinceLastInteraction: number,
  tenureScore: number,
  hasActiveBuilders: boolean,
): number {
  if (hasActiveBuilders) return baseScore
  if (daysSinceLastInteraction <= 0) return baseScore

  // Grace period: tenure gates when decay begins, not just how fast
  const graceDays = tenureScore * 60
  const effectiveDays = Math.max(0, daysSinceLastInteraction - graceDays)
  if (effectiveDays === 0) return baseScore

  // Half-life: 30 days (new contacts) to 180 days (long tenure)
  const halfLife = 30 + tenureScore * 150
  const decayFactor = Math.pow(0.5, effectiveDays / halfLife)
  return baseScore * decayFactor
}

export function daysSince(timestamp: number | null, now: number = Date.now()): number {
  if (!timestamp) return 365
  return Math.max(0, (now - timestamp) / MS_PER_DAY)
}
