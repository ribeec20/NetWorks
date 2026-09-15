import type Graph from 'graphology'
import { YOU_NODE_ID } from './graph-builder'
import { getStrengthBand, getStrengthRadius } from './rings'

function normalizeAngle(angle: number): number {
  const turn = 2 * Math.PI
  return ((angle % turn) + turn) % turn
}

function circularDistance(a: number, b: number): number {
  const turn = 2 * Math.PI
  const delta = Math.abs(normalizeAngle(a) - normalizeAngle(b))
  return Math.min(delta, turn - delta)
}

export interface LayoutOptions {
  /** Minimum radius — closest ring to "You" (strength 100). Tuned for about 10 contacts on the innermost band. Default 1. */
  minRadius?: number
  /** Maximum radius — outermost ring (strength 1). Default 23. */
  maxRadius?: number
}

/**
 * Concentric 10-band radial layout.
 *
 * Contacts are grouped into 10 strength bands (0-9 … 90-100).
 * Each band has an inner and outer radius; exact strength determines
 * radial interpolation within the band.
 * Angular placement within each band is deterministic and slot-based.
 *
 * Only positions nodes with `needsLayout: true`.
 * Already-positioned nodes on the same band are accounted for when
 * calculating angles so new nodes fill gaps.
 */
export function applyRadialLayout(graph: Graph, options: LayoutOptions = {}): void {
  const { minRadius = 1, maxRadius = 23 } = options

  // Pin "You" at center
  graph.setNodeAttribute(YOU_NODE_ID, 'x', 0)
  graph.setNodeAttribute(YOU_NODE_ID, 'y', 0)

  // Collect all non-You nodes, split by whether they need layout
  const needsLayout: { id: string; strength: number }[] = []
  const positioned: { id: string; strength: number; x: number; y: number }[] = []

  graph.forEachNode((id, attrs) => {
    if (id === YOU_NODE_ID) return
    const strength = (attrs.strength as number) ?? 1
    if (attrs.needsLayout) {
      needsLayout.push({ id, strength })
    } else {
      positioned.push({ id, strength, x: attrs.x as number, y: attrs.y as number })
    }
  })

  if (needsLayout.length === 0) return

  // Group nodes needing layout by strength band.
  const ringMap = new Map<number, { id: string; strength: number }[]>()
  for (const node of needsLayout) {
    const band = getStrengthBand(node.strength)
    const list = ringMap.get(band)
    if (list) {
      list.push(node)
    } else {
      ringMap.set(band, [node])
    }
  }

  // Count how many already-positioned nodes sit on each band.
  const existingNodesPerBand = new Map<number, { id: string; angle: number }[]>()
  for (const node of positioned) {
    const band = getStrengthBand(node.strength)
    const angle = normalizeAngle(Math.atan2(node.y, node.x))
    const list = existingNodesPerBand.get(band)
    if (list) {
      list.push({ id: node.id, angle })
    } else {
      existingNodesPerBand.set(band, [{ id: node.id, angle }])
    }
  }

  // Place each band from inner to outer.
  const orderedBands = [...ringMap.entries()].sort((a, b) => a[0] - b[0])

  for (const [band, nodes] of orderedBands) {
    nodes.sort((a, b) => a.id.localeCompare(b.id))

    const existingNodes = existingNodesPerBand.get(band) ?? []
    const totalOnBand = nodes.length + existingNodes.length

    // Canonical slot angles — slot 0 at top (−π/2 in screen coords).
    const angleStep = (2 * Math.PI) / totalOnBand
    const canonicalAngles = Array.from(
      { length: totalOnBand },
      (_, index) => normalizeAngle(-Math.PI / 2 + index * angleStep),
    )

    if (existingNodes.length === 0) {
      for (let i = 0; i < nodes.length; i++) {
        const angle = canonicalAngles[i]
        const radius = getStrengthRadius(nodes[i].strength, band, minRadius, maxRadius)
        graph.setNodeAttribute(nodes[i].id, 'x', Math.cos(angle) * radius)
        graph.setNodeAttribute(nodes[i].id, 'y', Math.sin(angle) * radius)
      }
    } else {
      // Reserve nearest canonical slots for existing nodes.
      const usedSlots = new Set<number>()

      for (const existingNode of existingNodes) {
        let bestSlot = -1
        let bestDistance = Number.POSITIVE_INFINITY

        for (let slotIndex = 0; slotIndex < canonicalAngles.length; slotIndex++) {
          if (usedSlots.has(slotIndex)) continue
          const distance = circularDistance(existingNode.angle, canonicalAngles[slotIndex])
          if (distance < bestDistance) {
            bestDistance = distance
            bestSlot = slotIndex
          }
        }

        if (bestSlot >= 0) {
          usedSlots.add(bestSlot)
        }
      }

      const availableSlots = canonicalAngles
        .map((angle, idx) => ({ angle, idx }))
        .filter(({ idx }) => !usedSlots.has(idx))

      for (let i = 0; i < nodes.length; i++) {
        const angle = availableSlots[i].angle
        const radius = getStrengthRadius(nodes[i].strength, band, minRadius, maxRadius)
        graph.setNodeAttribute(nodes[i].id, 'x', Math.cos(angle) * radius)
        graph.setNodeAttribute(nodes[i].id, 'y', Math.sin(angle) * radius)
      }
    }
  }
}

export { applyRadialLayout as applyLayout }
