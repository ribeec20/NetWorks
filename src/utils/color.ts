const TAG_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#6366f1', // indigo
]

const STRENGTH_STRONG = '#14b8a6'  // teal
const STRENGTH_GROWING = '#f59e0b' // amber
const STRENGTH_WEAK = '#9ca3af'    // gray

export function strengthToColor(score: number): string {
  if (score >= 60) return STRENGTH_STRONG
  if (score >= 30) return STRENGTH_GROWING
  return STRENGTH_WEAK
}

export function strengthToEdgeSize(score: number): number {
  if (score >= 60) return 5
  if (score >= 30) return 3
  return 1
}

export function tagToColor(tag: string): string {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

export const YOU_NODE_COLOR = '#7c3aed' // purple
export const MUTUAL_EDGE_COLOR = '#d1d5db' // light gray
export const DEFAULT_NODE_COLOR = '#9ca3af' // gray for untagged
