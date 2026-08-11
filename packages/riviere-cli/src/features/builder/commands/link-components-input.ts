import type { SourceLocation } from '@living-architecture/riviere-schema'

/** @riviere-role command-use-case-input */
export interface LinkComponentsInput {
  condition?: string
  from: string
  graphPathOption: string | undefined
  relationshipType?: string
  sourceLocation?: SourceLocation
  targetDomain: string
  targetModule: string
  targetName: string
  targetType: string
  type: string | undefined
}
