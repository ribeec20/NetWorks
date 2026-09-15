export type TagClass = 'industry' | 'relationship' | 'context'

export interface TagDefinition {
  name: string
  class: TagClass | null
  builtIn: boolean
  createdAt: number
}
