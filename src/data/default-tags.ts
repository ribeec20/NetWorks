import type { TagClass } from '../types/tag'

export interface DefaultTag {
  name: string
  class: TagClass
}

export const DEFAULT_TAGS: DefaultTag[] = [
  // Industry
  { name: 'tech', class: 'industry' },
  { name: 'finance', class: 'industry' },
  { name: 'healthcare', class: 'industry' },
  { name: 'legal', class: 'industry' },
  { name: 'consulting', class: 'industry' },
  { name: 'education', class: 'industry' },
  { name: 'real estate', class: 'industry' },
  { name: 'media', class: 'industry' },
  { name: 'government', class: 'industry' },
  { name: 'retail', class: 'industry' },

  // Relationship
  { name: 'client', class: 'relationship' },
  { name: 'investor', class: 'relationship' },
  { name: 'mentor', class: 'relationship' },
  { name: 'colleague', class: 'relationship' },
  { name: 'founder', class: 'relationship' },
  { name: 'advisor', class: 'relationship' },
  { name: 'partner', class: 'relationship' },
  { name: 'vendor', class: 'relationship' },
  { name: 'recruiter', class: 'relationship' },

  // Context
  { name: 'alumni', class: 'context' },
  { name: 'conference', class: 'context' },
  { name: 'cold outreach', class: 'context' },
  { name: 'referral', class: 'context' },
  { name: 'online', class: 'context' },
]

export const TAG_CLASS_LABELS: Record<string, string> = {
  industry: 'Industry',
  relationship: 'Relationship',
  context: 'Context',
}

export const TAG_CLASS_ORDER: string[] = ['industry', 'relationship', 'context']
