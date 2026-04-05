import type { CustomPropertyDefinition } from '@living-architecture/riviere-schema'

/** @riviere-role command-use-case-result-value */
export type DefineCustomTypeErrorCode = 'GRAPH_CORRUPTED' | 'GRAPH_NOT_FOUND' | 'VALIDATION_ERROR'

/** @riviere-role command-use-case-result */
export type DefineCustomTypeResult =
  | {
    description: string | undefined
    name: string
    optionalProperties: Record<string, CustomPropertyDefinition>
    requiredProperties: Record<string, CustomPropertyDefinition>
    success: true
  }
  | {
    code: DefineCustomTypeErrorCode
    message: string
    success: false
  }
