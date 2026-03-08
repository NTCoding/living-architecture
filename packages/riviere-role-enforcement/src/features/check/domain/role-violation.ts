import type { TargetSymbol } from './target-symbol'

export type RoleViolationCode =
  | 'no-role-matched'
  | 'multiple-roles-matched'
  | 'disallowed-public-methods'

export interface RoleViolation {
  code: RoleViolationCode
  target: TargetSymbol
  message: string
  matchingRoles: readonly string[]
  markdownSpec: string | null
  disallowedPublicMethods: readonly string[]
}
