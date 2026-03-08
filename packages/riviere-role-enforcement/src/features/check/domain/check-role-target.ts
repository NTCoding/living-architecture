import type {
  CompiledRoleDefinition,
  CompiledRoleEnforcementConfig,
} from '../../../platform/domain/role-enforcement-config'
import { matchesAnyPattern } from '../../../platform/infra/path-patterns'
import type { RoleViolation } from './role-violation'
import type { TargetSymbol } from './target-symbol'

function createRunClassifierMessage(): string {
  return 'Next step for Claude: run `riviere-role-classifier` with this file and the requested change before editing.'
}

function createNoRoleMatchedViolation(target: TargetSymbol): RoleViolation {
  return {
    code: 'no-role-matched',
    target,
    message: [
      `Role enforcement error: no role matched for ${target.kind} '${target.name}'.`,
      createRunClassifierMessage(),
    ].join(' '),
    matchingRoles: [],
    markdownSpec: null,
    disallowedPublicMethods: [],
  }
}

function createMultipleRolesMatchedViolation(
  target: TargetSymbol,
  matchingRoles: readonly CompiledRoleDefinition[],
): RoleViolation {
  const matchingRoleNames = matchingRoles.map((role) => role.name)

  return {
    code: 'multiple-roles-matched',
    target,
    message: [
      `Role enforcement error: multiple roles matched for ${target.kind} '${target.name}': ${matchingRoleNames.join(', ')}.`,
      createRunClassifierMessage(),
    ].join(' '),
    matchingRoles: matchingRoleNames,
    markdownSpec: null,
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
      `Role enforcement error: class '${target.name}' matched role '${role.name}' but exposes disallowed public methods: ${disallowedPublicMethods.join(', ')}.`,
      `Markdown spec: ${role.markdownSpec}.`,
      createRunClassifierMessage(),
    ].join(' '),
    matchingRoles: [role.name],
    markdownSpec: role.markdownSpec,
    disallowedPublicMethods,
  }
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

export function findMatchingRoles(
  target: TargetSymbol,
  config: CompiledRoleEnforcementConfig,
): readonly CompiledRoleDefinition[] {
  if (!isFileInScope(target.relativeFilePath, config)) {
    return []
  }

  return config.roles.filter((role) => {
    if (!role.targets.includes(target.kind)) {
      return false
    }

    if (!role.namePattern.test(target.name)) {
      return false
    }

    return matchesAnyPattern(role.allowedLocationMatchers, target.relativeFilePath)
  })
}

export function checkTargetSymbol(
  target: TargetSymbol,
  config: CompiledRoleEnforcementConfig,
): readonly RoleViolation[] {
  if (!isFileInScope(target.relativeFilePath, config)) {
    return []
  }

  const matchingRoles = findMatchingRoles(target, config)

  if (matchingRoles.length === 0) {
    return [createNoRoleMatchedViolation(target)]
  }

  if (matchingRoles.length > 1) {
    return [createMultipleRolesMatchedViolation(target, matchingRoles)]
  }

  const matchedRole = matchingRoles[0]

  if (matchedRole === undefined) {
    return []
  }

  if (target.kind !== 'class' || matchedRole.allowedPublicMethodSet === undefined) {
    return []
  }

  const disallowedPublicMethods = target.publicMethodNames.filter(
    (methodName) => !matchedRole.allowedPublicMethodSet?.has(methodName),
  )

  if (disallowedPublicMethods.length === 0) {
    return []
  }

  return [createDisallowedPublicMethodsViolation(target, matchedRole, disallowedPublicMethods)]
}
