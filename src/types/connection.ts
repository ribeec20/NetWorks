export interface Connection {
  id: string
  sourceId: string
  targetId: string
  isDirect: boolean
  referralSource: string | null
  label: string | null
  createdAt: number
  updatedAt: number
}
