import type { CustomPropertyDefinition } from '@living-architecture/riviere-schema'

/** @riviere-role command-use-case-input */
export interface DefineCustomTypeInput {
  description: string | undefined
  graphPathOption: string | undefined
  name: string
  optionalProperties: Record<string, CustomPropertyDefinition>
  requiredProperties: Record<string, CustomPropertyDefinition>
}
