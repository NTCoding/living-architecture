import type {
  OperationBehavior,
  OperationSignature,
  StateTransition,
} from '@living-architecture/riviere-schema'

export interface EnrichmentInput {
  entity?: string
  stateChanges?: StateTransition[]
  businessRules?: string[]
  behavior?: OperationBehavior
  signature?: OperationSignature
}
