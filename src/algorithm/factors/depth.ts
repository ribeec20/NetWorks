import { MS_PER_DAY, FREQUENCY_WINDOW_DAYS, DEPTH_MULTIPLIERS, MAX_DEPTH_MULTIPLIER } from '../constants'
import type { Interaction } from '../../types'

/**
 * Depth factor (0-1): average depth multiplier of recent interactions,
 * normalized by the max multiplier.
 */
export function computeDepth(
  interactions: Interaction[],
  now: number = Date.now(),
): number {
  const windowStart = now - FREQUENCY_WINDOW_DAYS * MS_PER_DAY
  const recent = interactions.filter((i) => i.date >= windowStart)

  if (recent.length === 0) return 0

  const totalDepth = recent.reduce((sum, i) => sum + DEPTH_MULTIPLIERS[i.type], 0)
  const avgDepth = totalDepth / recent.length
  return Math.min(avgDepth / MAX_DEPTH_MULTIPLIER, 1)
}
