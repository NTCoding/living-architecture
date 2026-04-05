/** @riviere-role command-use-case-result-value */
export interface ChecklistComponent {
  domain: string
  id: string
  name: string
  type: string
}

/** @riviere-role command-use-case-result-value */
export type ComponentChecklistErrorCode = 'GRAPH_CORRUPTED' | 'GRAPH_NOT_FOUND'

/** @riviere-role command-use-case-result */
export type ComponentChecklistResult =
  | {
    components: ChecklistComponent[]
    success: true
    total: number
  }
  | {
    code: ComponentChecklistErrorCode
    message: string
    success: false
  }
