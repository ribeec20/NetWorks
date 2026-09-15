export interface OngoingBuilder {
  id: string
  contactId: string
  label: string
  hoursPerWeek: number | null
  startDate: number
  endDate: number | null
  createdAt: number
}
