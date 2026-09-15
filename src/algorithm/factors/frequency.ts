import { MS_PER_DAY, FREQUENCY_WINDOW_DAYS } from '../constants'
import type { Interaction } from '../../types'

/**
 * Frequency factor (0-1): interaction count in 90-day window.
 *
 * 6+ interactions (biweekly+) = 1.0, logarithmic scaling below that.
 * Monthly cadence (~3 in 90 days) scores ~0.70 instead of being penalized.
 */
export function computeFrequency(
  interactions: Interaction[],
  now: number = Date.now(),
): number {
  const windowStart = now - FREQUENCY_WINDOW_DAYS * MS_PER_DAY
  const recentCount = interactions.filter((i) => i.date >= windowStart).length

  if (recentCount === 0) return 0
  if (recentCount >= 6) return 1

  return Math.log(recentCount + 1) / Math.log(7)
}
