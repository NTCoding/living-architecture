import type {
  OperationSignature, StateTransition 
} from '@living-architecture/riviere-schema'

/** @riviere-role command-use-case-input */
export interface EnrichComponentInput {
  businessRules: string[]
  entity: string | undefined
  graphPathOption: string | undefined
  id: string
  modifies: string[]
  emits: string[]
  reads: string[]
  signature: OperationSignature | undefined
  stateChanges: StateTransition[]
  validates: string[]
}
