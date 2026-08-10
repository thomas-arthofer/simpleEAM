export type EntityType =
  | 'capability'
  | 'application'
  | 'aicomponent'
  | 'dataobject'
  | 'infrastructure'
  | 'businessprocess'

export interface EntityRef {
  id: string
  type: EntityType
}
