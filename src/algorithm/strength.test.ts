import { describe, it, expect } from 'vitest'
import { computeTenure } from './factors/tenure'
import { computeRecency } from './factors/recency'
import { computeFrequency } from './factors/frequency'
import { computeDepth } from './factors/depth'
import { computeBuilders } from './factors/builders'
import { computeStrength } from './strength'
import type { Contact, Interaction, OngoingBuilder } from '../types'

const MS_PER_DAY = 86400000
const MS_PER_YEAR = MS_PER_DAY * 365

const NOW = Date.now()

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: 'test-contact',
    firstName: 'Test',
    lastName: 'User',
    positions: [],
    notes: '',
    socials: [],
    tags: [],
    dateAdded: NOW,
    dateFirstMet: NOW - MS_PER_YEAR, // 1 year ago
    userStrengthOverride: null,
    createdAt: NOW,
    updatedAt: NOW, strength: 0, strengthHistory: [], x: null, y: null,
    ...overrides,
  }
}

function makeInteraction(overrides: Partial<Interaction> = {}): Interaction {
  return {
    id: 'test-interaction',
    contactId: 'test-contact',
    date: NOW - MS_PER_DAY, // yesterday
    type: 'message',
    notes: '',
    duration: null,
    createdAt: NOW,
    ...overrides,
  }
}

function makeBuilder(overrides: Partial<OngoingBuilder> = {}): OngoingBuilder {
  return {
    id: 'test-builder',
    contactId: 'test-contact',
    label: 'Test Builder',
    hoursPerWeek: 4,
    startDate: NOW - 30 * MS_PER_DAY,
    endDate: null,
    createdAt: NOW,
    ...overrides,
  }
}

describe('computeTenure', () => {
  it('returns 0 for a contact met today', () => {
    expect(computeTenure(NOW, NOW)).toBe(0)
  })

  it('returns ~0.2 for 1 year', () => {
    const score = computeTenure(NOW - MS_PER_YEAR, NOW)
    expect(score).toBeCloseTo(0.2, 1)
  })

  it('returns 1.0 for 5+ years', () => {
    expect(computeTenure(NOW - 6 * MS_PER_YEAR, NOW)).toBe(1)
  })

  it('caps at 1.0', () => {
    expect(computeTenure(NOW - 10 * MS_PER_YEAR, NOW)).toBe(1)
  })
})

describe('computeRecency', () => {
  it('returns 0 for no interactions', () => {
    expect(computeRecency(null, 0.5, NOW)).toBe(0)
  })

  it('returns ~1 for very recent interaction', () => {
    expect(computeRecency(NOW, 0.5, NOW)).toBeCloseTo(1, 1)
  })

  it('decays faster for low tenure contacts', () => {
    const twoWeeksAgo = NOW - 14 * MS_PER_DAY
    const lowTenure = computeRecency(twoWeeksAgo, 0.1, NOW)
    const highTenure = computeRecency(twoWeeksAgo, 0.9, NOW)
    expect(lowTenure).toBeLessThan(highTenure)
  })
})

describe('computeFrequency', () => {
  it('returns 0 for no interactions', () => {
    expect(computeFrequency([], NOW)).toBe(0)
  })

  it('returns 1 for 12+ recent interactions', () => {
    const interactions = Array.from({ length: 15 }, (_, i) =>
      makeInteraction({ id: `i-${i}`, date: NOW - i * 5 * MS_PER_DAY })
    )
    expect(computeFrequency(interactions, NOW)).toBe(1)
  })

  it('ignores interactions outside the window', () => {
    const oldInteraction = makeInteraction({ date: NOW - 100 * MS_PER_DAY })
    expect(computeFrequency([oldInteraction], NOW)).toBe(0)
  })
})

describe('computeDepth', () => {
  it('returns 0 for no interactions', () => {
    expect(computeDepth([], NOW)).toBe(0)
  })

  it('returns higher for collaboration than messages', () => {
    const collab = [makeInteraction({ type: 'collaboration' })]
    const msgs = [makeInteraction({ type: 'message' })]
    expect(computeDepth(collab, NOW)).toBeGreaterThan(computeDepth(msgs, NOW))
  })
})

describe('computeBuilders', () => {
  it('returns 0 with no builders', () => {
    expect(computeBuilders([], NOW)).toBe(0)
  })

  it('returns 0.5 for 4 hrs/week', () => {
    expect(computeBuilders([makeBuilder({ hoursPerWeek: 4 })], NOW)).toBe(0.5)
  })

  it('caps at 1 for 8+ hrs/week', () => {
    expect(computeBuilders([makeBuilder({ hoursPerWeek: 10 })], NOW)).toBe(1)
  })

  it('ignores ended builders', () => {
    const ended = makeBuilder({ endDate: NOW - MS_PER_DAY })
    expect(computeBuilders([ended], NOW)).toBe(0)
  })
})

describe('computeStrength', () => {
  it('returns a score between 0 and 100', () => {
    const contact = makeContact()
    const result = computeStrength(contact, [], [], true, NOW)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('higher score with more recent interactions', () => {
    const contact = makeContact()
    const noInteractions = computeStrength(contact, [], [], true, NOW)
    const withInteraction = computeStrength(
      contact,
      [makeInteraction({ date: NOW - MS_PER_DAY })],
      [],
      true,
      NOW,
    )
    expect(withInteraction.score).toBeGreaterThan(noInteractions.score)
  })

  it('active builders increase score', () => {
    const contact = makeContact()
    const without = computeStrength(contact, [], [], true, NOW)
    const withBuilder = computeStrength(contact, [], [makeBuilder()], true, NOW)
    expect(withBuilder.score).toBeGreaterThan(without.score)
  })

  it('flags shouldTransitionToDirect when indirect and score >= 40', () => {
    const contact = makeContact({ dateFirstMet: NOW - 3 * MS_PER_YEAR })
    const interactions = Array.from({ length: 12 }, (_, i) =>
      makeInteraction({ id: `i-${i}`, date: NOW - i * 5 * MS_PER_DAY, type: 'collaboration' })
    )
    const result = computeStrength(contact, interactions, [makeBuilder()], false, NOW)
    if (result.score >= 40) {
      expect(result.shouldTransitionToDirect).toBe(true)
    }
  })

  it('does not flag transition for already direct contacts', () => {
    const contact = makeContact({ dateFirstMet: NOW - 3 * MS_PER_YEAR })
    const interactions = Array.from({ length: 12 }, (_, i) =>
      makeInteraction({ id: `i-${i}`, date: NOW - i * 5 * MS_PER_DAY, type: 'collaboration' })
    )
    const result = computeStrength(contact, interactions, [makeBuilder()], true, NOW)
    expect(result.shouldTransitionToDirect).toBe(false)
  })
})
