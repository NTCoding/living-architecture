import type { SourceLocation } from '@living-architecture/riviere-schema'

/** @riviere-role command-use-case-input */
export interface LinkComponentsInput {
  condition: string | undefined
  from: string
  graphPathOption: string | undefined
  relationshipType: string | undefined
  sourceLocation: SourceLocation | undefined
  to: string
  type: 'sync' | 'async' | undefined
}
