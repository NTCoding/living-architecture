import type { ComponentType } from '@living-architecture/riviere-schema'

export interface NearMatchQuery {
  name: string
  type?: ComponentType
  domain?: string
}

export interface NearMatchMismatch {
  field: 'type' | 'domain'
  expected: string
  actual: string
}

export interface NearMatchResult {
  component: import('@living-architecture/riviere-schema').Component
  score: number
  mismatch?: NearMatchMismatch | undefined
}

export interface NearMatchOptions {
  threshold?: number
  limit?: number
}
