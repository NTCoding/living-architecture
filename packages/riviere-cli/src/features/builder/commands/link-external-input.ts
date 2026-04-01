import type { ExternalTarget } from '@living-architecture/riviere-schema'

/** @riviere-role command-use-case-input */
export interface LinkExternalInput {
  from: string
  graphPathOption: string | undefined
  target: ExternalTarget
  type: 'sync' | 'async' | undefined
}
