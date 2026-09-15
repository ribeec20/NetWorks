import { describe, expect, it } from 'vitest'
import type { Connection, Contact } from '../types'
import { buildGraph, getNodeSizeForBand } from './graph-builder'
import { applyRadialLayout } from './layout'
import { BAND_COUNT, getBandGeometry, getStrengthBand } from './rings'

const NOW = Date.now()
const MIN_RADIUS = 1
const MAX_RADIUS = 23

function makeContact(index: number, strength: number): Contact {
  return {
    id: `contact-${index}`,
    firstName: `Contact${index}`,
    lastName: `Band${getStrengthBand(strength)}`,
    positions: [],
    notes: '',
    socials: [],
    tags: [],
    dateAdded: NOW,
    dateFirstMet: NOW,
    strength,
    strengthHistory: [],
    userStrengthOverride: null,
    x: null,
    y: null,
    createdAt: NOW,
    updatedAt: NOW,
  }
}

function makeConnection(contactId: string): Connection {
  return {
    id: `conn-${contactId}`,
    sourceId: 'self',
    targetId: contactId,
    isDirect: true,
    referralSource: null,
    label: null,
    createdAt: NOW,
    updatedAt: NOW,
  }
}

function makeFortyContacts(): Contact[] {
  const contacts: Contact[] = []

  for (let bandIndex = 0; bandIndex < BAND_COUNT; bandIndex += 1) {
    const bandBottom = (9 - bandIndex) * 10
    const bandTop = bandIndex === 0 ? 100 : bandBottom + 9
    const strengths = [bandTop, bandTop - 3, bandTop - 6, bandBottom]

    for (const strength of strengths) {
      contacts.push(makeContact(contacts.length + 1, strength))
    }
  }

  return contacts
}

function normalizeAngle(angle: number): number {
  const turn = 2 * Math.PI
  return ((angle % turn) + turn) % turn
}

describe('fixed 10-band radial layout', () => {
  it('lays out 40 contacts as 4 contacts per strength band', () => {
    const contacts = makeFortyContacts()
    const connections = contacts.map((contact) => makeConnection(contact.id))

    const graph = buildGraph(contacts, connections)
    applyRadialLayout(graph, { minRadius: MIN_RADIUS, maxRadius: MAX_RADIUS })

    const nodesByBand = new Map<number, Array<{ id: string; strength: number; x: number; y: number }>>()

    for (const contact of contacts) {
      const strength = graph.getNodeAttribute(contact.id, 'strength') as number
      const x = graph.getNodeAttribute(contact.id, 'x') as number
      const y = graph.getNodeAttribute(contact.id, 'y') as number
      const band = getStrengthBand(strength)
      const list = nodesByBand.get(band) ?? []
      list.push({ id: contact.id, strength, x, y })
      nodesByBand.set(band, list)

      const radius = Math.hypot(x, y)
      const { innerRadius, outerRadius } = getBandGeometry(band, MIN_RADIUS, MAX_RADIUS)
      expect(radius).toBeGreaterThanOrEqual(innerRadius - 1e-6)
      expect(radius).toBeLessThanOrEqual(outerRadius + 1e-6)
    }

    expect(nodesByBand.size).toBe(BAND_COUNT)

    for (let bandIndex = 0; bandIndex < BAND_COUNT; bandIndex += 1) {
      const nodes = nodesByBand.get(bandIndex) ?? []
      expect(nodes).toHaveLength(4)

      const strongerToWeaker = [...nodes].sort((a, b) => b.strength - a.strength)
      const radii = strongerToWeaker.map((node) => Math.hypot(node.x, node.y))
      expect(radii[0]).toBeLessThanOrEqual(radii[1])
      expect(radii[1]).toBeLessThanOrEqual(radii[2])
      expect(radii[2]).toBeLessThanOrEqual(radii[3])

      const sortedAngles = nodes
        .map((node) => normalizeAngle(Math.atan2(node.y, node.x)))
        .sort((a, b) => a - b)

      const gaps = sortedAngles.map((angle, index) => {
        const next = sortedAngles[(index + 1) % sortedAngles.length]!
        return index === sortedAngles.length - 1 ? next + 2 * Math.PI - angle : next - angle
      })

      for (const gap of gaps) {
        expect(gap).toBeCloseTo(Math.PI / 2, 6)
      }

      const size = graph.getNodeAttribute(nodes[0]!.id, 'size') as number
      expect(size).toBeCloseTo(getNodeSizeForBand(4, bandIndex), 6)
    }
  })

  it('shrinks node size as a band gets denser', () => {
    expect(getNodeSizeForBand(8, 0)).toBeGreaterThan(getNodeSizeForBand(12, 0))
    expect(getNodeSizeForBand(12, 0)).toBeGreaterThan(getNodeSizeForBand(24, 0))
    expect(getNodeSizeForBand(24, 0)).toBeGreaterThanOrEqual(5.5)
  })
})