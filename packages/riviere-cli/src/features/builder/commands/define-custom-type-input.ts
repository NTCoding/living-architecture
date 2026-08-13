/** @riviere-role command-use-case-input */
export interface DefineCustomTypeInput {
  description: string | undefined
  graphPathOption: string | undefined
  name: string
  optionalProperties: Record<string, { description?: string; type: string }>
  requiredProperties: Record<string, { description?: string; type: string }>
}
