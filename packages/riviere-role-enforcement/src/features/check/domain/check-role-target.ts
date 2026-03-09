import type {
  CompiledRoleDefinition,
  CompiledRoleEnforcementConfig,
} from '../../../platform/domain/role-enforcement-config'
import { matchesAnyPattern } from '../../../platform/infra/path-patterns'
import type { RoleViolation } from './role-violation'
import type { TargetSymbol } from './target-symbol'

function createRunClassifierMessage(): string {
  return "Next step for Claude: run 'riviere-role-classifier' before editing."
}

function createRoleViolation(
  code: RoleViolation['code'],
  target: TargetSymbol,
  assignedRoleName: string | null,
  why: string,
  suggestedFix: string,
  markdownSpec: string | null,
  disallowedPublicMethods: readonly string[],
): RoleViolation {
  const details = [
    `Role enforcement error: ${code}`,
    '',
    `File: ${target.relativeFilePath}`,
    `Symbol: ${target.name}`,
  ]

  if (assignedRoleName !== null) {
    details.push(`Assigned role: ${assignedRoleName}`)
  }

  details.push(`Why: ${why}`)
  details.push(`Suggested fix: ${suggestedFix}`)

  return {
    code,
    target,
    assignedRoleName,
    message: details.join('\n'),
    matchingRoles: assignedRoleName === null ? [] : [assignedRoleName],
    markdownSpec,
    disallowedPublicMethods,
    suggestedFix,
  }
}

function createMissingRoleAssignmentViolation(target: TargetSymbol): RoleViolation {
  return createRoleViolation(
    'missing-role-assignment',
    target,
    null,
    `${formatTarget(target)} declares no explicit role assignment.`,
    `${createRunClassifierMessage()} Expected classifier output: explicit role assignment, top-level layer, allowed destination path, markdownSpec, and rationale.`,
    null,
    [],
  )
}

function createUnknownRoleAssignmentViolation(
  target: TargetSymbol,
  assignedRoleName: string,
): RoleViolation {
  return createRoleViolation(
    'unknown-role-assignment',
    target,
    assignedRoleName,
    `No role named '${assignedRoleName}' exists in the repository role catalog.`,
    `${createRunClassifierMessage()} Choose a valid repository role and update the explicit assignment.`,
    null,
    [],
  )
}

function createInvalidRoleTargetKindViolation(
  target: TargetSymbol,
  role: CompiledRoleDefinition,
): RoleViolation {
  return createRoleViolation(
    'invalid-role-target-kind',
    target,
    role.name,
    `${formatTarget(target)} is a ${target.kind}, but role '${role.name}' only applies to ${formatTargetKinds(role.targets)}.`,
    `${createRunClassifierMessage()} Keep the symbol in a supported target kind or choose a role that allows ${target.kind} targets.`,
    role.markdownSpec,
    [],
  )
}

function createInvalidRoleLocationViolation(
  target: TargetSymbol,
  role: CompiledRoleDefinition,
): RoleViolation {
  return createRoleViolation(
    'invalid-role-location',
    target,
    role.name,
    `Role '${role.name}' is assigned, but '${target.relativeFilePath}' is outside ${formatAllowedLocations(role.allowedLocation)}.`,
    `${createRunClassifierMessage()} Move the symbol into an allowed location for '${role.name}' or choose the correct role for this path.`,
    role.markdownSpec,
    [],
  )
}

function createInvalidRoleNameViolation(
  target: TargetSymbol,
  role: CompiledRoleDefinition,
): RoleViolation {
  const allowedNameMessage =
    role.allowedNames === undefined
      ? `Allowed name pattern: ${role.nameMatches}.`
      : `Allowed names: ${role.allowedNames.join(', ')}.`

  return createRoleViolation(
    'invalid-role-name',
    target,
    role.name,
    `${formatTarget(target)} does not satisfy the naming rules for role '${role.name}'. ${allowedNameMessage}`,
    `Keep role '${role.name}', rename the symbol to an allowed name, and re-run validation.`,
    role.markdownSpec,
    [],
  )
}

function createDisallowedPublicMethodsViolation(
  target: TargetSymbol,
  role: CompiledRoleDefinition,
  allowedPublicMethods: readonly string[],
  disallowedPublicMethods: readonly string[],
): RoleViolation {
  return createRoleViolation(
    'disallowed-public-methods',
    target,
    role.name,
    `${formatTarget(target)} exposes ${formatDisallowedMethods(disallowedPublicMethods)} not allowed for role '${role.name}'. Allowed public methods: ${allowedPublicMethods.join(', ')}.`,
    `${createRunClassifierMessage()} Re-check the role markdown spec before changing the class API.`,
    role.markdownSpec,
    disallowedPublicMethods,
  )
}

function formatAllowedLocations(allowedLocation: readonly string[]): string {
  if (allowedLocation.length === 1) {
    return `'${allowedLocation[0]}'`
  }

  return allowedLocation.map((location) => `'${location}'`).join(', ')
}

function formatTargetKinds(targetKinds: readonly string[]): string {
  return `${targetKinds.join(', ')} targets`
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

  if (
    target.kind !== 'class' ||
    assignedRole.allowedPublicMethodSet === undefined ||
    assignedRole.allowedPublicMethods === undefined
  ) {
    return []
  }

  const disallowedPublicMethods = target.publicMethodNames.filter(
    (methodName) => !assignedRole.allowedPublicMethodSet?.has(methodName),
  )

  if (disallowedPublicMethods.length === 0) {
    return []
  }

  return [
    createDisallowedPublicMethodsViolation(
      target,
      assignedRole,
      assignedRole.allowedPublicMethods,
      disallowedPublicMethods,
    ),
  ]
}
