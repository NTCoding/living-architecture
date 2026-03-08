import type { TargetSymbol } from './target-symbol'

export type RoleViolationCode =
  | 'missing-role-assignment'
  | 'unknown-role-assignment'
  | 'invalid-role-target-kind'
  | 'invalid-role-location'
  | 'invalid-role-name'
  | 'disallowed-public-methods'

export interface RoleViolation {
  code: RoleViolationCode
  target: TargetSymbol
  message: string
  matchingRoles: readonly string[]
  markdownSpec: string | null
  disallowedPublicMethods: readonly string[]
}
