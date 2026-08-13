/** @riviere-role command-use-case-input */
export interface EnrichComponentInput {
  businessRules: string[]
  entity: string | undefined
  graphPathOption: string | undefined
  id: string
  modifies: string[]
  emits: string[]
  reads: string[]
  signature:
    | {
        parameters?: Array<{ description?: string; name: string; type: string }>
        returnType?: string
      }
    | undefined
  stateChanges: Array<{ from: string; to: string }>
  validates: string[]
}
