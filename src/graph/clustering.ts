import type Graph from 'graphology'
import type { Contact } from '../types/contact'
import type { ClusterBy } from '../stores/ui-store'
import { tagToColor, DEFAULT_NODE_COLOR } from '../utils/color'
import { DEFAULT_TAGS } from '../data/default-tags'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClusterGroup {
  key: string
  label: string
  color: string
  contactIds: string[]
  startAngle: number
  endAngle: number
}

export interface ClusterPlan {
  groups: ClusterGroup[]
}

// ---------------------------------------------------------------------------
// Industry lookup (built once at module scope)
// ---------------------------------------------------------------------------

const INDUSTRY_TAG_SET = new Set(
  DEFAULT_TAGS.filter((t) => t.class === 'industry').map((t) => t.name),
)

// ---------------------------------------------------------------------------
// Time bucket config
// ---------------------------------------------------------------------------

const TIME_BUCKETS = [
  { key: 'last-30d', label: 'Last 30 days', maxAge: 30 },
  { key: '1-3m', label: '1–3 months', maxAge: 90 },
  { key: '3-6m', label: '3–6 months', maxAge: 180 },
  { key: '6-12m', label: '6–12 months', maxAge: 365 },
  { key: '1-2y', label: '1–2 years', maxAge: 730 },
  { key: '2y+', label: '2+ years', maxAge: Infinity },
]

const TIME_BUCKET_COLORS = [
  '#14b8a6', // teal-500
  '#2dd4bf', // teal-400
  '#5eead4', // teal-300
  '#99f6e4', // teal-200
  '#b0b8c1', // gray-blue
  '#9ca3af', // gray-400
]

// ---------------------------------------------------------------------------
// computeClusterPlan
// ---------------------------------------------------------------------------

export function computeClusterPlan(
  contacts: Contact[],
  clusterBy: ClusterBy,
  visibleIds: Set<string> | null,
): ClusterPlan {
  // Filter to visible contacts only
  const filtered = visibleIds
    ? contacts.filter((c) => visibleIds.has(c.id))
    : contacts

  // Group contacts
  const groupMap = new Map<string, string[]>() // key → contactIds

  for (const c of filtered) {
    const key = getGroupKey(c, clusterBy)
    const list = groupMap.get(key)
    if (list) {
      list.push(c.id)
    } else {
      groupMap.set(key, [c.id])
    }
  }

  // Build ordered group entries
  const entries = [...groupMap.entries()]

  // Sort: alphabetical for tag/industry, chronological for time
  if (clusterBy === 'time-added') {
    const order = TIME_BUCKETS.map((b) => b.key)
    entries.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
  } else {
    // Put "Untagged"/"Other" last, rest alphabetical
    entries.sort((a, b) => {
      const aIsOther = a[0] === '__untagged__' || a[0] === '__other__'
      const bIsOther = b[0] === '__untagged__' || b[0] === '__other__'
      if (aIsOther && !bIsOther) return 1
      if (!aIsOther && bIsOther) return -1
      return a[0].localeCompare(b[0])
    })
  }

  // Allocate angles
  const totalContacts = filtered.length
  if (totalContacts === 0) return { groups: [] }

  const startOffset = -Math.PI / 2 // top of circle

  let cursor = startOffset
  const groups: ClusterGroup[] = []

  for (const [key, contactIds] of entries) {
    const span = (contactIds.length / totalContacts) * 2 * Math.PI
    const start = cursor
    const end = cursor + span
    groups.push({
      key,
      label: getGroupLabel(key, clusterBy),
      color: getGroupColor(key, clusterBy),
      contactIds,
      startAngle: start,
      endAngle: end,
    })
    cursor = end
  }

  return { groups }
}

// ---------------------------------------------------------------------------
// computeClusteredPositions
// ---------------------------------------------------------------------------

export function computeClusteredPositions(
  graph: Graph,
  plan: ClusterPlan,
): Map<string, { x: number; y: number }> {
  const targets = new Map<string, { x: number; y: number }>()

  for (const group of plan.groups) {
    const sectorSpan = group.endAngle - group.startAngle
    const count = group.contactIds.length
    if (count === 0) continue

    // Sort contacts by their current angle to minimize crossing
    const withAngle = group.contactIds.map((id) => {
      const x = (graph.getNodeAttribute(id, 'x') as number) ?? 0
      const y = (graph.getNodeAttribute(id, 'y') as number) ?? 0
      return { id, x, y, angle: Math.atan2(y, x) }
    })
    withAngle.sort((a, b) => a.angle - b.angle)

    for (let i = 0; i < withAngle.length; i++) {
      const { id, x, y } = withAngle[i]
      const radius = Math.sqrt(x * x + y * y)
      // Prevent zero-radius nodes from collapsing to center
      const safeRadius = Math.max(radius, 0.5)
      const newAngle = group.startAngle + ((i + 0.5) / count) * sectorSpan
      targets.set(id, {
        x: Math.cos(newAngle) * safeRadius,
        y: Math.sin(newAngle) * safeRadius,
      })
    }
  }

  return targets
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGroupKey(contact: Contact, clusterBy: ClusterBy): string {
  switch (clusterBy) {
    case 'tag':
      return contact.tags[0] ?? '__untagged__'

    case 'industry': {
      const industryTag = contact.tags.find((t) => INDUSTRY_TAG_SET.has(t))
      return industryTag ?? '__other__'
    }

    case 'time-added': {
      const now = Date.now()
      const ageDays = (now - contact.dateAdded) / (1000 * 60 * 60 * 24)
      for (const bucket of TIME_BUCKETS) {
        if (ageDays <= bucket.maxAge) return bucket.key
      }
      return TIME_BUCKETS[TIME_BUCKETS.length - 1].key
    }
  }
}

function getGroupLabel(key: string, clusterBy: ClusterBy): string {
  if (key === '__untagged__') return 'Untagged'
  if (key === '__other__') return 'Other'

  if (clusterBy === 'time-added') {
    const bucket = TIME_BUCKETS.find((b) => b.key === key)
    return bucket?.label ?? key
  }

  // Capitalize first letter of tag name
  return key.charAt(0).toUpperCase() + key.slice(1)
}

function getGroupColor(key: string, clusterBy: ClusterBy): string {
  if (key === '__untagged__' || key === '__other__') return DEFAULT_NODE_COLOR

  if (clusterBy === 'time-added') {
    const idx = TIME_BUCKETS.findIndex((b) => b.key === key)
    return TIME_BUCKET_COLORS[idx >= 0 ? idx : TIME_BUCKET_COLORS.length - 1]
  }

  return tagToColor(key)
}
