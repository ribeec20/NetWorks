import Graph from 'graphology'
import type { Contact, Connection } from '../types'
import { SELF_ID } from '../stores/contact-store'
import {
  strengthToColor,
  strengthToEdgeSize,
  tagToColor,
  YOU_NODE_COLOR,
  MUTUAL_EDGE_COLOR,
  DEFAULT_NODE_COLOR,
} from '../utils/color'
import { BAND_COUNT, MIN_RADIUS, MAX_RADIUS, getBandCenterRadius, getStrengthBand } from './rings'

const YOU_NODE_ID = 'you'
const YOU_NODE_SIZE = 15.5
const REFERENCE_NODES_PER_BAND = 10
const MIN_SEPARATION_RATIO = 0.35
const RADIAL_SEPARATION_RATIO = 0.2
const OUTER_BAND_SIZE_ATTENUATION = 0.08

const MAX_NODE_SIZE = 11.5
const MIN_NODE_SIZE = 5.5

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function getNodeSizeForBand(
  nodesOnBand: number,
  bandIndex: number,
  minRadius = MIN_RADIUS,
  maxRadius = MAX_RADIUS,
): number {
  const safeNodeCount = Math.max(1, nodesOnBand)
  const sizingRadius = getBandCenterRadius(bandIndex, minRadius, maxRadius)
  const referenceRadius = getBandCenterRadius(0, minRadius, maxRadius)
  const previousRadius = bandIndex > 0 ? getBandCenterRadius(bandIndex - 1, minRadius, maxRadius) : null
  const nextRadius = bandIndex < BAND_COUNT - 1 ? getBandCenterRadius(bandIndex + 1, minRadius, maxRadius) : null
  const nearestBandDistance = Math.min(
    previousRadius == null ? Number.POSITIVE_INFINITY : sizingRadius - previousRadius,
    nextRadius == null ? Number.POSITIVE_INFINITY : nextRadius - sizingRadius,
  )

  const referenceNextRadius = getBandCenterRadius(1, minRadius, maxRadius)
  const referenceBandDistance = referenceNextRadius - referenceRadius

  const availableArc = (2 * Math.PI * sizingRadius) / safeNodeCount
  const referenceArc = (2 * Math.PI * referenceRadius) / REFERENCE_NODES_PER_BAND

  const usableAngularDiameter = availableArc * (1 - MIN_SEPARATION_RATIO)
  const usableRadialDiameter = nearestBandDistance * (1 - RADIAL_SEPARATION_RATIO)
  const referenceAngularDiameter = referenceArc * (1 - MIN_SEPARATION_RATIO)
  const referenceRadialDiameter = referenceBandDistance * (1 - RADIAL_SEPARATION_RATIO)
  const usableDiameter = Math.min(usableAngularDiameter, usableRadialDiameter)
  const referenceDiameter = Math.min(referenceAngularDiameter, referenceRadialDiameter)
  const densityScale = usableDiameter / referenceDiameter
  const outerBandScale = 1 - (bandIndex / Math.max(1, BAND_COUNT - 1)) * OUTER_BAND_SIZE_ATTENUATION

  return clamp(MAX_NODE_SIZE * densityScale * outerBandScale, MIN_NODE_SIZE, MAX_NODE_SIZE)
}

function getInitials(name: string): string {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()

  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

function contactNodeColor(contact: Contact): string {
  if (contact.tags.length > 0) {
    return tagToColor(contact.tags[0])
  }
  return DEFAULT_NODE_COLOR
}

export function buildGraph(
  contacts: Contact[],
  connections: Connection[],
): Graph {
  const graph = new Graph()

  // Add "You" node at center
  graph.addNode(YOU_NODE_ID, {
    label: 'You',
    initials: 'Y',
    x: 0,
    y: 0,
    size: YOU_NODE_SIZE,
    color: YOU_NODE_COLOR,
    fixed: true,
  })

  // Build connection lookup by targetId for self connections
  const selfMap = new Map<string, Connection>()
  const peerConnections: Connection[] = []
  for (const conn of connections) {
    if (conn.sourceId === SELF_ID) {
      selfMap.set(conn.targetId, conn)
    } else {
      peerConnections.push(conn)
    }
  }

  // Count nodes per strength band to calculate sizes.
  const bandCounts = new Map<number, number>()
  for (const contact of contacts) {
    const band = getStrengthBand(contact.strength)
    bandCounts.set(band, (bandCounts.get(band) ?? 0) + 1)
  }

  // Add contact nodes — use persisted x/y if available
  for (const contact of contacts) {
    const strength = contact.strength
    const band = getStrengthBand(strength)
    const nodesOnBand = bandCounts.get(band) ?? 1
    const size = getNodeSizeForBand(nodesOnBand, band)

    const currentPos = contact.positions.find((p) => p.endDate === null)

    const label = `${contact.firstName} ${contact.lastName}`.trim()

    graph.addNode(contact.id, {
      label,
      initials: getInitials(label),
      x: contact.x ?? 0,
      y: contact.y ?? 0,
      size,
      color: contactNodeColor(contact),
      strength,
      tag: contact.tags[0] ?? '',
      role: currentPos?.role ?? '',
      company: currentPos?.company ?? '',
      needsLayout: contact.x == null,
    })
  }

  // Add edges from "You" to each contact
  for (const contact of contacts) {
    const conn = selfMap.get(contact.id)
    const strength = contact.strength
    const isDirect = conn?.isDirect ?? true

    graph.addEdge(YOU_NODE_ID, contact.id, {
      size: strengthToEdgeSize(strength),
      color: strengthToColor(strength),
      type: 'line',
      strength,
      isDirect,
    })
  }

  // Add peer connection edges (contact↔contact)
  for (const conn of peerConnections) {
    if (graph.hasNode(conn.sourceId) && graph.hasNode(conn.targetId)) {
      graph.addEdge(conn.sourceId, conn.targetId, {
        size: 1,
        color: MUTUAL_EDGE_COLOR,
        type: 'line',
        isMutual: true,
      })
    }
  }

  return graph
}

export { YOU_NODE_ID }
