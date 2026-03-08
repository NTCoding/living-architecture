import type {
  CompiledRoleDefinition,
  CompiledRoleEnforcementConfig,
} from '../../../platform/domain/role-enforcement-config'
import { matchesAnyPattern } from '../../../platform/infra/path-patterns'
import type { RoleViolation } from './role-violation'
import type { TargetSymbol } from './target-symbol'

function createRunClassifierMessage(): string {
  return 'Next step for Claude: run riviere-role-classifier.'
}

function createMissingRoleAssignmentViolation(target: TargetSymbol): RoleViolation {
  return {
    code: 'missing-role-assignment',
    target,
    message: [
      `${formatTarget(target)} has no explicit role assignment.`,
      createRunClassifierMessage(),
    ].join(' '),
    matchingRoles: [],
    markdownSpec: null,
    disallowedPublicMethods: [],
  }
}

function createUnknownRoleAssignmentViolation(
  target: TargetSymbol,
  assignedRoleName: string,
): RoleViolation {
  return {
    code: 'unknown-role-assignment',
    target,
    message: `${formatTarget(target)} declares role '${assignedRoleName}', but no such role exists.`,
    matchingRoles: [assignedRoleName],
    markdownSpec: null,
    disallowedPublicMethods: [],
  }
}

function createInvalidRoleTargetKindViolation(
  target: TargetSymbol,
  role: CompiledRoleDefinition,
): RoleViolation {
  return {
    code: 'invalid-role-target-kind',
    target,
    message: [
      `${formatTarget(target)} has role '${role.name}' but that role only applies to ${formatTargetKinds(role.targets)}.`,
      createRunClassifierMessage(),
    ].join(' '),
    matchingRoles: [role.name],
    markdownSpec: role.markdownSpec,
    disallowedPublicMethods: [],
  }
}

function createInvalidRoleLocationViolation(
  target: TargetSymbol,
  role: CompiledRoleDefinition,
): RoleViolation {
  return {
    code: 'invalid-role-location',
    target,
    message: [
      `${formatTarget(target)} has role '${role.name}' but lives in '${target.relativeFilePath}'.`,
      `Role '${role.name}' must live in ${formatAllowedLocations(role.allowedLocation)}.`,
    ].join(' '),
    matchingRoles: [role.name],
    markdownSpec: role.markdownSpec,
    disallowedPublicMethods: [],
  }
}

function createInvalidRoleNameViolation(
  target: TargetSymbol,
  role: CompiledRoleDefinition,
): RoleViolation {
  return {
    code: 'invalid-role-name',
    target,
    message: [
      `${formatTarget(target)} has role '${role.name}' but its name is not allowed for that role.`,
      createAllowedNameMessage(role),
    ].join(' '),
    matchingRoles: [role.name],
    markdownSpec: role.markdownSpec,
    disallowedPublicMethods: [],
  }
}

function createDisallowedPublicMethodsViolation(
  target: TargetSymbol,
  role: CompiledRoleDefinition,
  disallowedPublicMethods: readonly string[],
): RoleViolation {
  return {
    code: 'disallowed-public-methods',
    target,
    message: [
      `${formatTarget(target)} has role '${role.name}' but ${formatDisallowedMethods(disallowedPublicMethods)} not allowed for that role.`,
      `Allowed public methods: ${formatAllowedPublicMethods(role)}.`,
    ].join(' '),
    matchingRoles: [role.name],
    markdownSpec: role.markdownSpec,
    disallowedPublicMethods,
  }
}

function createAllowedNameMessage(role: CompiledRoleDefinition): string {
  if (role.allowedNames !== undefined) {
    return `Allowed names: ${role.allowedNames.join(', ')}.`
  }

  return `Allowed name pattern: ${role.nameMatches ?? '<none>'}.`
}

function formatAllowedLocations(allowedLocation: readonly string[]): string {
  if (allowedLocation.length === 1) {
    return `'${allowedLocation[0]}'`
  }

  return allowedLocation.map((location) => `'${location}'`).join(', ')
}

function formatTargetKinds(targetKinds: readonly string[]): string {
  if (targetKinds.length === 1) {
    return `${targetKinds[0]} targets`
  }

  return `${targetKinds.join(', ')} targets`
}

function formatAllowedPublicMethods(role: CompiledRoleDefinition): string {
  return role.allowedPublicMethods?.join(', ') ?? '<none>'
}

function formatDisallowedMethods(disallowedPublicMethods: readonly string[]): string {
  if (disallowedPublicMethods.length === 1) {
    return `method '${disallowedPublicMethods[0]}' is`
  }

  const quotedMethodNames = disallowedPublicMethods
    .map((methodName) => `'${methodName}'`)
    .join(', ')

  return `methods ${quotedMethodNames} are`
}

function formatTarget(target: TargetSymbol): string {
  const targetKind = target.kind === 'class' ? 'Class' : 'Function'
  return `${targetKind} '${target.name}'`
}

function hasAllowedName(target: TargetSymbol, role: CompiledRoleDefinition): boolean {
  if (role.allowedNameSet !== undefined) {
    return role.allowedNameSet.has(target.name)
  }

  if (role.namePattern !== undefined) {
    return role.namePattern.test(target.name)
  }

  return true
}

export function isFileInScope(
  relativeFilePath: string,
  config: CompiledRoleEnforcementConfig,
): boolean {
  if (matchesAnyPattern(config.ignoreMatchers, relativeFilePath)) {
    return false
  }

  if (config.includeMatchers.length === 0) {
    return true
  }

  return matchesAnyPattern(config.includeMatchers, relativeFilePath)
}

export function findAssignedRoleDefinition(
  target: TargetSymbol,
  config: CompiledRoleEnforcementConfig,
): CompiledRoleDefinition | null {
  if (target.assignedRoleName === null) {
    return null
  }

  return config.roles.find((role) => role.name === target.assignedRoleName) ?? null
}

export function checkTargetSymbol(
  target: TargetSymbol,
  config: CompiledRoleEnforcementConfig,
): readonly RoleViolation[] {
  if (!isFileInScope(target.relativeFilePath, config)) {
    return []
  }

  if (target.assignedRoleName === null) {
    return [createMissingRoleAssignmentViolation(target)]
  }

  const assignedRole = findAssignedRoleDefinition(target, config)

  if (assignedRole === null) {
    return [createUnknownRoleAssignmentViolation(target, target.assignedRoleName)]
  }

  if (!assignedRole.targets.includes(target.kind)) {
    return [createInvalidRoleTargetKindViolation(target, assignedRole)]
  }

  if (!matchesAnyPattern(assignedRole.allowedLocationMatchers, target.relativeFilePath)) {
    return [createInvalidRoleLocationViolation(target, assignedRole)]
  }

  if (!hasAllowedName(target, assignedRole)) {
    return [createInvalidRoleNameViolation(target, assignedRole)]
  }

  if (target.kind !== 'class' || assignedRole.allowedPublicMethodSet === undefined) {
    return []
  }

  const disallowedPublicMethods = target.publicMethodNames.filter(
    (methodName) => !assignedRole.allowedPublicMethodSet?.has(methodName),
  )

  if (disallowedPublicMethods.length === 0) {
    return []
  }

  return [createDisallowedPublicMethodsViolation(target, assignedRole, disallowedPublicMethods)]
}
