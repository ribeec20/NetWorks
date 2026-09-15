import type { StrengthHistoryEntry } from '../types'

const MAX_HISTORY = 52

/**
 * Build an updated strengthHistory array.
 * Computes the delta from the previous entry, appends the new one,
 * and trims to the most recent 52 entries.
 */
export function pushStrengthHistory(
  history: StrengthHistoryEntry[] | undefined,
  newStrength: number,
): StrengthHistoryEntry[] {
  const prev = history ?? []
  const lastStrength = prev.length > 0 ? prev[prev.length - 1].strength : 0
  const entry: StrengthHistoryEntry = {
    date: Date.now(),
    strength: newStrength,
    delta: newStrength - lastStrength,
  }
  const updated = [...prev, entry]
  return updated.length > MAX_HISTORY ? updated.slice(-MAX_HISTORY) : updated
}

/**
 * Color for a strength delta value.
 * Positive → teal (improvement), zero → amber (stable), negative → red (decline).
 */
export function deltaToColor(delta: number): string {
  if (delta > 0) return '#14b8a6' // teal
  if (delta < 0) return '#ef4444' // red
  return '#f59e0b' // amber
}
