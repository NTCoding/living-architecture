export type RoleTarget = 'class' | 'function' | 'interface' | 'type-alias'

export interface RoleDefinition {
  allowedInputs?: string[]
  allowedLocation: string[]
  allowedNames?: string[]
  allowedOutputs?: string[]
  name: string
  nameMatches?: string
  targets: RoleTarget[]
}

export interface RoleEnforcementConfig {
  ignorePatterns: string[]
  include: string[]
  roles: RoleDefinition[]
}
