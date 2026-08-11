import {
  type AssignedLocationConfiguration,
  type FluentLocationDefinition,
  type LocationBuilder,
  type LocationConfiguration,
  type LocationDependencyRules,
} from './location-configuration'

export { location, locationConfiguration } from './location-configuration'
export type { LocationBuilder, LocationConfiguration } from './location-configuration'

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
  readonly configurations: Readonly<Record<string, AssignedLocationConfiguration<R>>>
  readonly ignorePatterns: readonly string[]
  readonly importAliases?: Readonly<Record<string, string>>
  readonly roleDefinitionsDir: string
  readonly roles: readonly BuiltRole<R>[]
  readonly workspacePackageSources?: Record<string, string>
}

/** @riviere-role value-object */
export interface BuiltLocationNode {
  readonly allowAnySubLocations: boolean
  readonly allowedRoles: readonly string[]
  readonly dependencyRules?: LocationDependencyRules<string>
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
  const assignedConfigurations = Object.values(input.configurations)
  return {
    ignorePatterns: input.ignorePatterns,
    ...(input.importAliases !== undefined && { importAliases: input.importAliases }),
    include: assignedConfigurations.flatMap((configuration) =>
      configuration.packages.flatMap((pkg) => [`${pkg}/src/**/*.ts`, `${pkg}/src/**/*.tsx`]),
    ),
    locationHierarchy: assignedConfigurations.flatMap((configuration) =>
      buildFluentLocationHierarchy(configuration.packages, configuration.locations),
    ),
    roleDefinitionsDir: input.roleDefinitionsDir,
    roles: input.roles,
    ...(input.workspacePackageSources !== undefined && {workspacePackageSources: input.workspacePackageSources,}),
  }
}

function buildFluentLocationHierarchy<R extends string>(
  packages: readonly string[],
  configuration: LocationConfiguration<R>,
): BuiltLocationNode[] {
  return packages.flatMap((pkg) =>
    configuration.locations.flatMap((root) => buildFluentLocation(root, pkg)),
  )
}

function buildFluentLocation<R extends string>(
  root: LocationBuilder<R>,
  packagePath: string,
): BuiltLocationNode[] {
  const definitions = [root, ...root.subLocations]
  return definitions.map((definition) => {
    const relativePath =
      definition === root
        ? normalizeLocationPath(root.path)
        : `${normalizeLocationPath(root.path)}/${normalizeLocationPath(definition.path)}`
    const parent = findFluentParent(definition, root, definitions)
    const pathTemplate = `${packagePath}/${relativePath}`
    return {
      allowAnySubLocations: definition.allowAnySubLocations,
      allowedRoles: definition.allowedRoles,
      ...(definition.dependencyRules !== undefined && {dependencyRules: definition.dependencyRules,}),
      id: `${packagePath}:${pathTemplate}`,
      name: definition.path,
      packagePath,
      ...(parent !== undefined && {parentId: `${packagePath}:${packagePath}/${fluentRelativePath(root, parent)}`,}),
      pathTemplate,
    }
  })
}

function findFluentParent<R extends string>(
  definition: FluentLocationDefinition<R>,
  root: FluentLocationDefinition<R>,
  definitions: readonly FluentLocationDefinition<R>[],
): FluentLocationDefinition<R> | undefined {
  if (definition === root) {
    return undefined
  }
  const definitionPath = normalizeLocationPath(definition.path)
  return definitions
    .filter((candidate) => candidate !== definition)
    .filter((candidate) => {
      if (candidate === root) {
        return true
      }
      const candidatePath = normalizeLocationPath(candidate.path)
      return definitionPath.startsWith(`${candidatePath}/`)
    })
    .sort((left, right) => fluentLocationDepth(right, root) - fluentLocationDepth(left, root))[0]
}

function fluentLocationDepth<R extends string>(
  definition: FluentLocationDefinition<R>,
  root: FluentLocationDefinition<R>,
): number {
  return definition === root ? 0 : normalizeLocationPath(definition.path).split('/').length
}

function fluentRelativePath<R extends string>(
  root: FluentLocationDefinition<R>,
  definition: FluentLocationDefinition<R>,
): string {
  if (definition === root) {
    return normalizeLocationPath(root.path)
  }
  return `${normalizeLocationPath(root.path)}/${normalizeLocationPath(definition.path)}`
}

function normalizeLocationPath(locationPath: string): string {
  return locationPath.split('/').filter(Boolean).join('/')
}
