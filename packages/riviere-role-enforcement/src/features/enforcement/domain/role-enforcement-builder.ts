/** @riviere-role value-object */
export type RoleTarget = 'class' | 'function' | 'interface' | 'type-alias'

interface ApprovedInstance {
  readonly name: string
  readonly userHasApproved: true
}

interface RoleOptions<R extends string = string> {
  readonly targets: readonly RoleTarget[]
  readonly allowedInputs?: readonly R[]
  readonly allowedNames?: readonly string[]
  readonly allowedOutputs?: readonly R[]
  readonly approvedInstances?: readonly ApprovedInstance[]
  readonly forbiddenCallableMembers?: true
  readonly forbiddenSupertypes?: readonly string[]
  readonly forbiddenDependencies?: readonly R[]
  readonly forbiddenMethodCalls?: readonly R[]
  readonly requiredPrivateMembers?: readonly string[]
  readonly requiresDataMembers?: true
  readonly nameMatches?: string
  readonly maxPublicMethods?: number
  readonly minPublicMethods?: number
}

/** @riviere-role value-object */
export interface BuiltRole<N extends string = string> {
  readonly name: N
  readonly targets: readonly RoleTarget[]
  readonly allowedInputs?: readonly string[]
  readonly allowedNames?: readonly string[]
  readonly allowedOutputs?: readonly string[]
  readonly approvedInstances?: readonly ApprovedInstance[]
  readonly forbiddenCallableMembers?: true
  readonly forbiddenSupertypes?: readonly string[]
  readonly forbiddenDependencies?: readonly string[]
  readonly forbiddenMethodCalls?: readonly string[]
  readonly requiredPrivateMembers?: readonly string[]
  readonly requiresDataMembers?: true
  readonly maxPublicMethods?: number
  readonly nameMatches?: string
  readonly minPublicMethods?: number
}

/** @riviere-role domain-service */
export function role<const N extends string>(name: N, options: RoleOptions): BuiltRole<N> {
  return {
    name,
    ...options,
  }
}

/** @riviere-role domain-service */
export function createRoleFactory<R extends string>() {
  return <const N extends R>(name: N, options: RoleOptions<R>): BuiltRole<N> => ({
    name,
    ...options,
  })
}

interface RoleEnforcementInput<R extends string> {
  readonly additionalLocationEnforcement?: readonly {
    readonly locations: LocationStructure<R>
    readonly packages: readonly string[]
  }[]
  readonly ignorePatterns: readonly string[]
  readonly importAliases?: Readonly<Record<string, string>>
  readonly locations: LocationStructure<R>
  readonly packages: readonly string[]
  readonly roleDefinitionsDir: string
  readonly roles: readonly BuiltRole<R>[]
  readonly workspacePackageSources?: Record<string, string>
}

/** @riviere-role value-object */
interface LocationImportRule<R extends string> {
  readonly location: string
  readonly roles?: readonly R[]
}

/** @riviere-role value-object */
interface LocationDependencyRules<R extends string> {
  readonly canImportSiblings?: false
  readonly importableFrom?: 'withinParentLocation'
  readonly locations?: readonly LocationImportRule<R>[]
  readonly externalPackages?: readonly string[]
}

interface LocationRules<R extends string> {
  readonly dependencyRules?: LocationDependencyRules<R>
  readonly roles?: readonly R[]
}

type LocationNode<R extends string> = {
  readonly path?: string
  readonly rules?: LocationRules<R>
} & (
  | {
    readonly allowAnySubLocations: true
    readonly subLocations?: never
  }
  | {
    readonly allowAnySubLocations?: false
    readonly subLocations?: LocationStructure<R>
  }
)

/** @riviere-role value-object */
export type LocationStructure<R extends string> = Readonly<Record<string, LocationNode<R>>>

/** @riviere-role value-object */
export interface BuiltLocationNode {
  readonly allowAnySubLocations: boolean
  readonly allowedRoles: readonly string[]
  readonly dependencyRules?: LocationDependencyRules<string>
  readonly enforceRoles: boolean
  readonly id: string
  readonly name: string
  readonly packagePath: string
  readonly parentId?: string
  readonly pathTemplate: string
}

/** @riviere-role value-object */
export interface RoleEnforcementResult {
  readonly ignorePatterns: readonly string[]
  readonly importAliases?: Readonly<Record<string, string>>
  readonly include: readonly string[]
  readonly locationHierarchy: readonly BuiltLocationNode[]
  readonly roleDefinitionsDir: string
  readonly roles: readonly BuiltRole[]
  readonly workspacePackageSources?: Record<string, string>
}

/** @riviere-role domain-service */
export function roleEnforcement<const R extends string>(
  input: RoleEnforcementInput<R>,
): RoleEnforcementResult {
  const locationHierarchy = [
    ...buildLocationHierarchy(input.packages, input.locations, true),
    ...(input.additionalLocationEnforcement ?? []).flatMap((additional) =>
      buildLocationHierarchy(additional.packages, additional.locations, false),
    ),
  ]
  const allPackages = [
    ...input.packages,
    ...(input.additionalLocationEnforcement ?? []).flatMap((additional) => additional.packages),
  ]

  return {
    ignorePatterns: input.ignorePatterns,
    ...(input.importAliases !== undefined && { importAliases: input.importAliases }),
    include: allPackages.flatMap((pkg) => [`${pkg}/src/**/*.ts`, `${pkg}/src/**/*.tsx`]),
    locationHierarchy,
    roleDefinitionsDir: input.roleDefinitionsDir,
    roles: input.roles,
    ...(input.workspacePackageSources !== undefined && {workspacePackageSources: input.workspacePackageSources,}),
  }
}

function buildLocationHierarchy<R extends string>(
  packages: readonly string[],
  structure: LocationStructure<R>,
  enforceRoles: boolean,
): BuiltLocationNode[] {
  const result: BuiltLocationNode[] = []
  for (const pkg of packages) {
    visitLocationStructure(structure, pkg, undefined, pkg, result, enforceRoles)
  }
  return result
}

function visitLocationStructure<R extends string>(
  structure: LocationStructure<R>,
  parentPath: string,
  parentId: string | undefined,
  packagePath: string,
  result: BuiltLocationNode[],
  enforceRoles: boolean,
): void {
  for (const [name, node] of Object.entries(structure)) {
    if (node.allowAnySubLocations === true && node.subLocations !== undefined) {
      throw new InvalidLocationStructureError(
        `Location '${name}' cannot define both allowAnySubLocations and subLocations`,
      )
    }

    const segment = node.path ?? name
    const pathTemplate = `${parentPath}/${segment}`
    const id = `${packagePath}:${pathTemplate}`
    const allowedRoles = node.rules?.roles ?? []
    result.push({
      allowAnySubLocations: node.allowAnySubLocations === true,
      allowedRoles,
      ...(node.rules?.dependencyRules !== undefined && {dependencyRules: node.rules.dependencyRules,}),
      enforceRoles,
      id,
      name,
      packagePath,
      ...(parentId !== undefined && { parentId }),
      pathTemplate,
    })

    if (node.subLocations !== undefined) {
      visitLocationStructure(node.subLocations, pathTemplate, id, packagePath, result, enforceRoles)
    }
  }
}

/** @riviere-role domain-error */
class InvalidLocationStructureError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidLocationStructureError'
  }
}
