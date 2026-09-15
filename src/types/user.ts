export type UserTier = 'free' | 'paid'

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system'
  themeId?: string
  showConnections?: boolean
  showNames?: boolean
}

export interface UserProfile {
  id: string
  email: string
  displayName: string
  tier: UserTier
  contactCount: number
  purchaseDate: number | null
  createdAt: number
  preferences?: UserPreferences
}
