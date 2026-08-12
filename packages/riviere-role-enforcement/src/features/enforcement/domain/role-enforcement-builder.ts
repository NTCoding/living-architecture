import { type LocationBuilder, type LocationConfiguration } from './location-configuration'

export { location, locationConfiguration } from './location-configuration'
export type { LocationBuilder, LocationConfiguration } from './location-configuration'

type RoleTarget = 'class' | 'function' | 'interface' | 'type-alias'

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
  readonly forbiddenCallableDataMembers?: true
  readonly forbiddenSupertypes?: readonly string[]
  readonly forbiddenDependencies?: readonly R[]
  readonly forbiddenMethodCalls?: readonly R[]
  readonly requiredPrivateMembers?: readonly string[]
  readonly requiresPrivateConstructor?: true
  readonly requiredStaticMethodNamePrefix?: string
  readonly requiresDataMembers?: true
  readonly nameMatches?: string
  readonly maxPublicMethods?: number
  readonly minPublicMethods?: number
}

interface BuiltRoleDefinition<N extends string = string> extends RoleOptions {readonly name: N}

/** @riviere-role value-object */
export class BuiltRole<N extends string = string> {
  declare private readonly brand: 'BuiltRole'

  declare readonly name: N
  declare readonly targets: readonly RoleTarget[]
  declare readonly allowedInputs?: readonly string[]
  declare readonly allowedNames?: readonly string[]
  declare readonly allowedOutputs?: readonly string[]
  declare readonly approvedInstances?: readonly ApprovedInstance[]
  declare readonly forbiddenCallableDataMembers?: true
  declare readonly forbiddenSupertypes?: readonly string[]
  declare readonly forbiddenDependencies?: readonly string[]
  declare readonly forbiddenMethodCalls?: readonly string[]
  declare readonly requiredPrivateMembers?: readonly string[]
  declare readonly requiresPrivateConstructor?: true
  declare readonly requiredStaticMethodNamePrefix?: string
  declare readonly requiresDataMembers?: true
  declare readonly maxPublicMethods?: number
  declare readonly nameMatches?: string
  declare readonly minPublicMethods?: number

  private constructor(definition: BuiltRoleDefinition<N>) {
    Object.assign(this, definition)
  }

  static parse<N extends string>(definition: BuiltRoleDefinition<N>): BuiltRole<N> {
    return new BuiltRole(definition)
  }
}

/** @riviere-role domain-service */
export function role<const N extends string>(name: N, options: RoleOptions): BuiltRole<N> {
  return BuiltRole.parse({
    name,
    ...options,
  })
}

/** @riviere-role domain-service */
export function createRoleFactory<R extends string>() {
  return <const N extends R>(name: N, options: RoleOptions<R>): BuiltRole<N> =>
    BuiltRole.parse({
      name,
      ...options,
    })
}

interface RoleEnforcementInput<R extends string> {
  readonly configurations: Readonly<
    Record<
      string,
      {
        readonly locations: LocationConfiguration<R>
        readonly packages: readonly string[]
      }
    >
  >
  readonly ignorePatterns: readonly string[]
  readonly importAliases?: Readonly<Record<string, string>>
  readonly roleDefinitionsDir: string
  readonly roles: readonly BuiltRole<R>[]
  readonly workspacePackageSources?: Record<string, string>
}

interface BuiltLocationNode {
  readonly allowAnySubLocations: boolean
  readonly allowedRoles: readonly string[]
  readonly dependencyRules?: LocationBuilder<string>['dependencyRules']
  readonly id: string
  readonly name: string
  readonly packagePath: string
  readonly parentId?: string
  readonly pathTemplate: string
}

interface RoleEnforcementResultDefinition {
  readonly ignorePatterns: readonly string[]
  readonly importAliases?: Readonly<Record<string, string>>
  readonly include: readonly string[]
  readonly locationHierarchy: readonly BuiltLocationNode[]
  readonly roleDefinitionsDir: string
  readonly roles: readonly BuiltRole[]
  readonly workspacePackageSources?: Record<string, string>
}

/** @riviere-role value-object */
export class RoleEnforcementResult {
  declare private readonly brand: 'RoleEnforcementResult'

  declare readonly ignorePatterns: readonly string[]
  declare readonly importAliases?: Readonly<Record<string, string>>
  declare readonly include: readonly string[]
  declare readonly locationHierarchy: readonly BuiltLocationNode[]
  declare readonly roleDefinitionsDir: string
  declare readonly roles: readonly BuiltRole[]
  declare readonly workspacePackageSources?: Record<string, string>

  private constructor(definition: RoleEnforcementResultDefinition) {
    Object.assign(this, definition)
  }

  static parse(definition: RoleEnforcementResultDefinition): RoleEnforcementResult {
    return new RoleEnforcementResult(definition)
  }
}

/** @riviere-role domain-service */
export function roleEnforcement<const R extends string>(
  input: RoleEnforcementInput<R>,
): RoleEnforcementResult {
  const assignedConfigurations = Object.values(input.configurations)
  return RoleEnforcementResult.parse({
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
  })
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
  definition: LocationBuilder<R>,
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
