import type { HttpMethod } from '@living-architecture/riviere-schema'

/** @riviere-role command-use-case-input */
export interface LinkHttpInput {
  graphPathOption: string | undefined
  httpMethod: HttpMethod | undefined
  linkType: 'sync' | 'async' | undefined
  path: string
  targetId: string
}
