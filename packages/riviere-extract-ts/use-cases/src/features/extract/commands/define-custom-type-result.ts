import type { CustomPropertyDefinition } from '@living-architecture/riviere-schema-published-language/schema'

/** @riviere-role command-use-case-result-value */
export type DefineCustomTypeErrorCode = 'GRAPH_CORRUPTED' | 'GRAPH_NOT_FOUND' | 'VALIDATION_ERROR'

/** @riviere-role command-use-case-result */
export interface DefineCustomTypeResult {
  readonly result:
    | {
        readonly description: string | undefined
        readonly name: string
        readonly optionalProperties: Record<string, CustomPropertyDefinition>
        readonly requiredProperties: Record<string, CustomPropertyDefinition>
        readonly success: true
      }
    | {
        readonly code: DefineCustomTypeErrorCode
        readonly message: string
        readonly success: false
      }
}
