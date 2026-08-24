import type { BuiltRole, LocationBuilder } from './role-enforcement-builder'
import { RoleEnforcementExecutionError } from './role-enforcement-execution-error'

interface ConfiguredLocation {
  readonly allowedRoles: readonly string[]
  readonly importRules?: LocationBuilder<string>['importRules']
  readonly name: string
}

const importScopes = ['sibling', 'root', 'ownSubdomain', 'anySubdomain'] as const

/** @riviere-role domain-service */
export function validateRoleConfiguration(
  roles: readonly BuiltRole[],
  locations: readonly ConfiguredLocation[],
): void {
  const roleNames = readUniqueRoleNames(roles)
  validateLocationRoleReferences(locations, roleNames)
  validateRoleRuleReferences(roles, roleNames)
}

function readUniqueRoleNames(roles: readonly BuiltRole[]): ReadonlySet<string> {
  const roleNames = new Set<string>()
  for (const roleDefinition of roles) {
    if (roleNames.has(roleDefinition.name)) {
      throw new RoleEnforcementExecutionError(
        `Role '${roleDefinition.name}' is defined more than once.`,
      )
    }
    roleNames.add(roleDefinition.name)
  }
  return roleNames
}

function validateLocationRoleReferences(
  locations: readonly ConfiguredLocation[],
  roleNames: ReadonlySet<string>,
): void {
  for (const configuredLocation of locations) {
    const referencedRoles = [
      ...configuredLocation.allowedRoles,
      ...readImportRuleRoles(configuredLocation.importRules),
    ]
    for (const roleName of referencedRoles) {
      if (!roleNames.has(roleName)) {
        throw new RoleEnforcementExecutionError(
          `Location '${configuredLocation.name}' allows unknown role '${roleName}'.`,
        )
      }
    }
  }
}

function readImportRuleRoles(importRules: ConfiguredLocation['importRules']): readonly string[] {
  const referencedRoles: string[] = []
  for (const scope of importScopes) {
    for (const allowedLocation of importRules?.allow?.[scope] ?? []) {
      if (typeof allowedLocation !== 'string') {
        referencedRoles.push(...Object.values(allowedLocation).flat())
      }
    }
  }
  return referencedRoles
}

function validateRoleRuleReferences(
  roles: readonly BuiltRole[],
  roleNames: ReadonlySet<string>,
): void {
  for (const roleDefinition of roles) {
    const references = readRoleRuleReferences(roleDefinition)
    for (const referencedRole of references) {
      if (!roleNames.has(referencedRole)) {
        throw new RoleEnforcementExecutionError(
          `Role '${roleDefinition.name}' references unknown role '${referencedRole}'.`,
        )
      }
    }
  }
}

function readRoleRuleReferences(roleDefinition: BuiltRole): readonly string[] {
  return [
    ...(roleDefinition.allowedInputs ?? []),
    ...(roleDefinition.allowedOutputs ?? []),
    ...(roleDefinition.allowedDependencyRoles ?? []),
    ...(roleDefinition.allowedDependentRoles ?? []),
    ...(roleDefinition.forbiddenDependencies ?? []),
    ...(roleDefinition.forbiddenMethodCalls ?? []),
    ...(roleDefinition.returns ?? []).flatMap((shape) => (shape['*'] === '*' ? [] : [shape['*']])),
  ]
}
