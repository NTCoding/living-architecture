/** @riviere-role command-use-case-input */
export interface LinkComponentsInput {
  from: string
  graphPathOption: string | undefined
  to: string
  type: 'sync' | 'async' | undefined
}
