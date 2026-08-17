/** @riviere-role command-use-case-result-value */
export interface ChecklistComponent {
  domain: string
  id: string
  name: string
  type: string
}

/** @riviere-role command-use-case-result-value */
export type ComponentChecklistErrorCode = 'GRAPH_CORRUPTED' | 'GRAPH_NOT_FOUND' | 'VALIDATION_ERROR'

/** @riviere-role command-use-case-result */
export interface ComponentChecklistResult {
  readonly result:
    | {
        readonly components: ChecklistComponent[]
        readonly success: true
        readonly total: number
      }
    | {
        readonly code: ComponentChecklistErrorCode
        readonly message: string
        readonly success: false
      }
}
