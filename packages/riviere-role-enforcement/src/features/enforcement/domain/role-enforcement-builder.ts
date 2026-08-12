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
  return packages.flatMap((pkg) => {
    const sourceRoot = buildSourceRoot(pkg)
    return [
      sourceRoot,
      ...configuration.locations.flatMap((root) => buildFluentLocation(root, pkg, sourceRoot)),
    ]
  })
}

function buildFluentLocation<R extends string>(
  root: LocationBuilder<R>,
  packagePath: string,
  sourceRoot: BuiltLocationNode,
): BuiltLocationNode[] {
  return buildFluentLocationNode(
    root,
    packagePath,
    sourceRoot.pathTemplate,
    `/${normalizeLocationPath(root.path)}`,
    true,
  )
}

function buildSourceRoot(packagePath: string): BuiltLocationNode {
  const pathTemplate = `${packagePath}/src`
  return {
    allowAnySubLocations: false,
    allowedRoles: [],
    id: `${packagePath}:${pathTemplate}`,
    name: '/',
    packagePath,
    pathTemplate,
  }
}

function buildFluentLocationNode<R extends string>(
  definition: FluentLocationDefinition<R>,
  packagePath: string,
  parentPathTemplate: string,
  locationName: string,
  isConfigurationRoot = false,
): BuiltLocationNode[] {
  const path = normalizeLocationPath(definition.path)
  const pathTemplate = `${parentPathTemplate}/${path}`
  const id = `${packagePath}:${pathTemplate}`
  const node: BuiltLocationNode = {
    allowAnySubLocations: definition.allowAnySubLocations,
    allowedRoles: definition.allowedRoles,
    ...(definition.dependencyRules !== undefined && {dependencyRules: definition.dependencyRules,}),
    id,
    name: locationName,
    packagePath,
    parentId: `${packagePath}:${parentPathTemplate}`,
    pathTemplate,
  }
  return [
    node,
    ...definition.subLocations.flatMap((child) => {
      const childPath = normalizeLocationPath(child.path)
      const childName = isConfigurationRoot ? `/${childPath}` : `${locationName}/${childPath}`
      return buildFluentLocationNode(child, packagePath, pathTemplate, childName)
    }),
  ]
}

function normalizeLocationPath(locationPath: string): string {
  return locationPath.split('/').filter(Boolean).join('/')
}
