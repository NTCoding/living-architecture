export type RoleTarget = 'class' | 'function' | 'interface' | 'type-alias'

export interface LayerDefinition {
  allowedRoles: string[]
  paths: string[]
}

export interface RoleDefinition {
  allowedInputs?: string[]
  allowedNames?: string[]
  allowedOutputs?: string[]
  forbiddenDependencies?: string[]
  name: string
  nameMatches?: string
  targets: RoleTarget[]
}

export interface RoleEnforcementConfig {
  ignorePatterns: string[]
  include: string[]
  layers: Record<string, LayerDefinition>
  roles: RoleDefinition[]
}
