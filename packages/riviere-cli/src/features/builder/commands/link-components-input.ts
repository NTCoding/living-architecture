import type { SourceLocation } from '@living-architecture/riviere-schema'

/** @riviere-role command-use-case-input */
export interface LinkComponentsInput {
  condition?: string
  from: string
  graphPathOption: string | undefined
  relationshipType?: string
  sourceLocation?: SourceLocation
  to: string
  type: 'sync' | 'async' | undefined
}
