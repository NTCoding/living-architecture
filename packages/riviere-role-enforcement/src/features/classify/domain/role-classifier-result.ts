import type {
  CompiledRoleDefinition,
  CompiledRoleEnforcementConfig,
  RoleTargetKind,
} from '../../../platform/domain/role-enforcement-config'

export type RoleClassifierStatus = 'clear' | 'ambiguous' | 'unknown-role'

export type RoleClassifierLayer = 'shell' | 'entrypoint' | 'command' | 'query' | 'domain' | 'infra'

export interface RoleClassifierAmbiguity {
  status: 'clear' | 'ambiguous'
  alternatives: readonly string[]
}

export interface RoleClassifierRequest {
  requestedChange: string
  requestedRoleName?: string | undefined
  targetKind?: RoleTargetKind | undefined
}

export interface RoleClassifierResult {
  status: RoleClassifierStatus
  layer: RoleClassifierLayer | null
  role: string | null
  assignmentText: string | null
  allowedLocation: readonly string[]
  markdownSpec: string | null
  rationale: readonly string[]
  nextAction: string
  ambiguity: RoleClassifierAmbiguity
}

function createAssignmentText(roleName: string): string {
  return `/** @riviere-role ${roleName} */`
}

function tokenize(input: string): readonly string[] {
  return Array.from(input.toLowerCase().matchAll(/[a-z0-9]+/g), (match) => match[0])
}

function inferLayerFromRole(role: CompiledRoleDefinition): RoleClassifierLayer | null {
  const joinedLocation = role.allowedLocation.join(' ')

  if (joinedLocation.includes('/shell/')) {
    return 'shell'
  }

  if (joinedLocation.includes('/entrypoint/')) {
    return 'entrypoint'
  }

  if (joinedLocation.includes('/commands/')) {
    return 'command'
  }

  if (joinedLocation.includes('/queries/')) {
    return 'query'
  }

  if (joinedLocation.includes('/domain/')) {
    return 'domain'
  }

  if (joinedLocation.includes('/infra/')) {
    return 'infra'
  }

  return null
}

function inferLayerFromRequest(request: string): RoleClassifierLayer | null {
  const tokens = new Set(tokenize(request))

  if (tokens.has('shell')) {
    return 'shell'
  }

  if (tokens.has('entrypoint')) {
    return 'entrypoint'
  }

  if (tokens.has('command') || tokens.has('commands')) {
    return 'command'
  }

  if (tokens.has('query') || tokens.has('queries')) {
    return 'query'
  }

  if (tokens.has('domain')) {
    return 'domain'
  }

  if (tokens.has('infra') || tokens.has('infrastructure')) {
    return 'infra'
  }

  return null
}

function createClearResult(
  role: CompiledRoleDefinition,
  rationale: readonly string[],
  nextAction: string,
): RoleClassifierResult {
  return {
    status: 'clear',
    layer: inferLayerFromRole(role),
    role: role.name,
    assignmentText: createAssignmentText(role.name),
    allowedLocation: role.allowedLocation,
    markdownSpec: role.markdownSpec,
    rationale,
    nextAction,
    ambiguity: {
      status: 'clear',
      alternatives: [],
    },
  }
}

function createNonClearResult(
  status: 'ambiguous' | 'unknown-role',
  layer: RoleClassifierLayer | null,
  rationale: readonly string[],
  nextAction: string,
  alternatives: readonly string[],
): RoleClassifierResult {
  return {
    status,
    layer,
    role: null,
    assignmentText: null,
    allowedLocation: [],
    markdownSpec: null,
    rationale,
    nextAction,
    ambiguity: {
      status: alternatives.length > 1 ? 'ambiguous' : 'clear',
      alternatives,
    },
  }
}

function scoreRole(
  role: CompiledRoleDefinition,
  request: RoleClassifierRequest,
  requestTokens: ReadonlySet<string>,
): number {
  if (request.targetKind !== undefined && !role.targets.includes(request.targetKind)) {
    return Number.NEGATIVE_INFINITY
  }

  const roleTokens = tokenize(role.name)
  const score = roleTokens.filter((token) => requestTokens.has(token)).length

  const requestLayer = inferLayerFromRequest(request.requestedChange)

  if (requestLayer !== null && inferLayerFromRole(role) === requestLayer) {
    return score + 1
  }

  return score
}

function rankRoles(
  request: RoleClassifierRequest,
  config: CompiledRoleEnforcementConfig,
): readonly CompiledRoleDefinition[] {
  const requestTokens = new Set(tokenize(request.requestedChange))

  return [...config.roles]
    .map((role) => ({
      role,
      score: scoreRole(role, request, requestTokens),
    }))
    .filter((entry) => Number.isFinite(entry.score) && entry.score > 0)
    .sort(
      (left, right) => right.score - left.score || left.role.name.localeCompare(right.role.name),
    )
    .map((entry) => entry.role)
}

function inferSharedLayer(roles: readonly CompiledRoleDefinition[]): RoleClassifierLayer | null {
  const layers = [...new Set(roles.map(inferLayerFromRole).filter((layer) => layer !== null))]

  return layers.length === 1
    ? layers.reduce<RoleClassifierLayer | null>((_, layer) => layer, null)
    : null
}

export function createRoleClassifierResult(
  role: CompiledRoleDefinition,
  rationale: readonly string[],
  nextAction: string,
): RoleClassifierResult {
  return createClearResult(role, rationale, nextAction)
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

  return createClearResult(role, rationale, nextAction)
}

export function classifyRoleRequest(
  request: RoleClassifierRequest,
  config: CompiledRoleEnforcementConfig,
): RoleClassifierResult {
  const requestTokens = new Set(tokenize(request.requestedChange))

  if (request.requestedRoleName !== undefined) {
    const requestedRole = config.roles.find((role) => role.name === request.requestedRoleName)

    if (requestedRole !== undefined) {
      return createClearResult(
        requestedRole,
        [`The requested role '${requestedRole.name}' exists in the repository role catalog.`],
        `Add ${createAssignmentText(requestedRole.name)} above the target and place it in an allowed location.`,
      )
    }

    const alternatives = rankRoles(request, config)
      .slice(0, 3)
      .map((role) => role.name)

    return createNonClearResult(
      'unknown-role',
      inferLayerFromRequest(request.requestedChange),
      [`No role named '${request.requestedRoleName}' exists in the repository role catalog.`],
      'Do not write code yet. Choose a valid repository role and then add the explicit assignment.',
      alternatives,
    )
  }

  const rankedRoles = rankRoles(request, config)
  const [bestRole, secondRole] = rankedRoles

  if (bestRole === undefined) {
    return createNonClearResult(
      'unknown-role',
      inferLayerFromRequest(request.requestedChange),
      ['The requested change did not map to any configured repository role.'],
      'Do not write code yet. Review the role catalog and extend it before adding an explicit assignment.',
      [],
    )
  }

  const bestScore = scoreRole(bestRole, request, requestTokens)
  const secondScore =
    secondRole === undefined
      ? Number.NEGATIVE_INFINITY
      : scoreRole(secondRole, request, requestTokens)

  if (bestScore === secondScore) {
    const alternatives = rankedRoles
      .filter((role) => scoreRole(role, request, requestTokens) === bestScore)
      .map((role) => role.name)

    return createNonClearResult(
      'ambiguous',
      inferSharedLayer(rankedRoles),
      ['Multiple repository roles match the requested change equally well.'],
      'Do not write code yet. Review the candidate roles and resolve the ambiguity first.',
      alternatives,
    )
  }

  return createClearResult(
    bestRole,
    [
      `Role '${bestRole.name}' best matches the requested change.`,
      `Its allowed locations place the code in the '${inferLayerFromRole(bestRole) ?? 'unknown'}' layer.`,
    ],
    `Add ${createAssignmentText(bestRole.name)} above the target and implement it in an allowed location.`,
  )
}
