export type RoleTargetKind = 'class' | 'function'

export type PathMatcher = (input: string) => boolean

export interface RoleDefinition {
  name: string
  targets: readonly RoleTargetKind[]
  allowedLocation: readonly string[]
  nameMatches: string
  allowedPublicMethods?: readonly string[] | undefined
  markdownSpec: string
}

export interface RoleEnforcementConfig {
  include?: readonly string[]
  ignorePatterns?: readonly string[]
  roles: readonly RoleDefinition[]
}

export interface CompiledRoleDefinition extends RoleDefinition {
  namePattern: RegExp
  allowedLocationMatchers: readonly PathMatcher[]
  allowedPublicMethodSet?: ReadonlySet<string> | undefined
}

export interface CompiledRoleEnforcementConfig {
  include: readonly string[]
  ignorePatterns: readonly string[]
  includeMatchers: readonly PathMatcher[]
  ignoreMatchers: readonly PathMatcher[]
  roles: readonly CompiledRoleDefinition[]
}
