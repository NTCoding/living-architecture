export type RoleTargetKind = 'class' | 'function' | 'static-method'

export type PathMatcher = (input: string) => boolean

export interface RoleDefinition {
  name: string
  targets: readonly RoleTargetKind[]
  allowedLocation: readonly string[]
  allowedNames?: readonly string[] | undefined
  nameMatches?: string | undefined
  allowedPublicMethods?: readonly string[] | undefined
  markdownSpec: string
}

export interface RoleEnforcementConfig {
  include?: readonly string[]
  ignorePatterns?: readonly string[]
  roles: readonly RoleDefinition[]
}

export interface CompiledRoleDefinition extends RoleDefinition {
  allowedLocationMatchers: readonly PathMatcher[]
  allowedNameSet?: ReadonlySet<string> | undefined
  namePattern?: RegExp | undefined
  allowedPublicMethodSet?: ReadonlySet<string> | undefined
}

export interface CompiledRoleEnforcementConfig {
  include: readonly string[]
  ignorePatterns: readonly string[]
  includeMatchers: readonly PathMatcher[]
  ignoreMatchers: readonly PathMatcher[]
  roles: readonly CompiledRoleDefinition[]
}
