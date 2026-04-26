import type { ComponentType } from '@living-architecture/riviere-schema'

/** @riviere-role query-model */
export interface NearMatchQuery {
  name: string
  type?: ComponentType
  domain?: string
}

/** @riviere-role query-model */
export interface NearMatchMismatch {
  field: 'type' | 'domain'
  expected: string
  actual: string
}

/** @riviere-role query-model */
export interface NearMatchResult {
  component: import('@living-architecture/riviere-schema').Component
  score: number
  mismatch?: NearMatchMismatch | undefined
}

/** @riviere-role query-model */
export interface NearMatchOptions {
  threshold?: number
  limit?: number
}
