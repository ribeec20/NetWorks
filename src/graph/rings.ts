/** Fixed number of strength bands. */
export const BAND_COUNT = 10

/** Canonical layout radius range — use these everywhere positions are computed. */
export const MIN_RADIUS = 1
export const MAX_RADIUS = 23

/**
 * Ratio of gap width to band width.
 * A 1:1 gap preserves clear band separation while leaving enough radial
 * thickness inside each band to show fine-grained strength changes.
 */
const GAP_RATIO = 1

function clampStrength(strength: number): number {
  return Math.max(0, Math.min(100, Math.round(strength)))
}

/**
 * Map a strength (0–100) to one of 10 fixed bands.
 *
 * Band 0 = strongest (90–100, closest to center).
 * Band 9 = weakest  (0–9, farthest from center).
 */
export function getStrengthBand(strength: number): number {
  const s = clampStrength(strength)
  if (s >= 100) return 0
  return 9 - Math.floor(s / 10)
}

export interface BandGeometry {
  innerRadius: number
  outerRadius: number
}

export function getBandCenterRadius(
  bandIndex: number,
  minRadius: number,
  maxRadius: number,
): number {
  const { innerRadius, outerRadius } = getBandGeometry(bandIndex, minRadius, maxRadius)
  return (innerRadius + outerRadius) / 2
}

/**
 * Compute inner/outer radius for a band.
 *
 * 10 bands of equal width are separated by gaps = GAP_RATIO × bandWidth.
 * Band 0 starts at minRadius; band 9 ends at maxRadius.
 */
export function getBandGeometry(
  bandIndex: number,
  minRadius: number,
  maxRadius: number,
): BandGeometry {
  const totalSpan = maxRadius - minRadius
  const bandWidth = totalSpan / (BAND_COUNT + (BAND_COUNT - 1) * GAP_RATIO)
  const step = bandWidth * (1 + GAP_RATIO)

  const innerRadius = minRadius + bandIndex * step
  const outerRadius = innerRadius + bandWidth

  return { innerRadius, outerRadius }
}

/**
 * Exact radius for a contact based on its strength within its band.
 *
 * Higher strength → inner radius (closer to center).
 * Lower strength  → outer radius.
 */
export function getStrengthRadius(
  strength: number,
  bandIndex: number,
  minRadius: number,
  maxRadius: number,
): number {
  const { innerRadius, outerRadius } = getBandGeometry(bandIndex, minRadius, maxRadius)
  const s = clampStrength(strength)

  // Strength range covered by this band
  const bandBottom = (9 - bandIndex) * 10 // band 0 → 90, band 9 → 0
  const bandTop = bandIndex === 0 ? 100 : bandBottom + 9

  if (bandTop <= bandBottom) return (innerRadius + outerRadius) / 2

  // t = 0 at inner (highest strength in band), t = 1 at outer (lowest)
  const t = Math.max(0, Math.min(1, (bandTop - s) / (bandTop - bandBottom)))

  return innerRadius + t * (outerRadius - innerRadius)
}
