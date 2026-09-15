export type InteractionType =
  | 'message'
  | 'email'
  | 'call'
  | 'video_call'
  | 'coffee_lunch'
  | 'meeting'
  | 'event'
  | 'collaboration'
  | 'other'

export interface Interaction {
  id: string
  contactId: string
  date: number
  type: InteractionType
  notes: string
  duration: number | null
  createdAt: number
}
