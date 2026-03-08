import type {
  CompiledRoleDefinition,
  CompiledRoleEnforcementConfig,
} from '../../../platform/domain/role-enforcement-config'

export interface RoleClassifierResult {
  role: string
  assignmentText: string
  allowedLocation: readonly string[]
  markdownSpec: string
  rationale: readonly string[]
  nextAction: string
}

export function createRoleClassifierResult(
  role: CompiledRoleDefinition,
  rationale: readonly string[],
  nextAction: string,
): RoleClassifierResult {
  return {
    role: role.name,
    assignmentText: `/** @riviere-role ${role.name} */`,
    allowedLocation: role.allowedLocation,
    markdownSpec: role.markdownSpec,
    rationale,
    nextAction,
  }
}

export function findRoleClassifierResult(
  roleName: string,
  config: CompiledRoleEnforcementConfig,
  rationale: readonly string[],
  nextAction: string,
): RoleClassifierResult | null {
  const role = config.roles.find((candidateRole) => candidateRole.name === roleName)

  if (role === undefined) {
    return null
  }

  return createRoleClassifierResult(role, rationale, nextAction)
}
