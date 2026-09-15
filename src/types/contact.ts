export interface CompanyPosition {
  company: string
  role: string
  startDate: number | null
  endDate: number | null // null = current position
}

export type SocialPlatform =
  | 'twitter'
  | 'linkedin'
  | 'github'
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'youtube'
  | 'discord'
  | 'bluesky'
  | 'website'

export interface SocialLink {
  platform: SocialPlatform
  value: string
}

export type HowWeMetCategory = 
  | 'professional_introduction'
  | 'referral'
  | 'cold_outreach'
  | 'existing_relationship'
  | 'event_conference'
  | 'online'
  | 'other'

export interface StrengthHistoryEntry {
  date: number
  strength: number
  delta: number
}

export interface Contact {
  id: string
  firstName: string
  lastName: string
  positions: CompanyPosition[]
  notes: string
  socials: SocialLink[]
  tags: string[]
  dateAdded: number
  dateFirstMet: number
  strength: number
  strengthHistory: StrengthHistoryEntry[]
  userStrengthOverride: number | null
  x: number | null
  y: number | null
  createdAt: number
  updatedAt: number
}
