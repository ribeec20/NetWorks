import type { OngoingBuilder } from '../../types'

/**
 * Ongoing builders factor (0-1): active builders contribute passive strength.
 *
 * Sum of hoursPerWeek (default 1 if null), normalized so 5+ hrs/week = 1.0.
 * Even low-intensity builders (1hr/week mentorship) contribute meaningfully.
 */
export function computeBuilders(
  builders: OngoingBuilder[],
  now: number = Date.now(),
): number {
  const active = builders.filter((b) => !b.endDate || b.endDate > now)

  if (active.length === 0) return 0

  const totalHours = active.reduce((sum, b) => sum + (b.hoursPerWeek ?? 1), 0)
  return Math.min(totalHours / 5, 1)
}
