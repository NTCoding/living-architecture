import { type LocationBuilder, type LocationConfiguration } from './location-configuration'
import { RoleEnforcementExecutionError } from './role-enforcement-execution-error'

export { location, locationConfiguration } from './location-configuration'
export type { LocationBuilder, LocationConfiguration } from './location-configuration'

type RoleTarget = 'class' | 'function' | 'interface' | 'type-alias' | 'variable'

interface ApprovedInstance {
  readonly name: string
  readonly userHasApproved: true
}

interface RoleConstraints<R extends string = string> {
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

interface ReturnShape<R extends string = string> {
  readonly success: boolean
  readonly '*': R | '*'
}

type RoleOptions<R extends string = string> = RoleConstraints<R> &
  (
    | {
        readonly targets: readonly RoleTarget[]
        readonly requiresDataStructure?: never
        readonly requiresDecoratorSignature?: never
        readonly requiresStringLiteralConstant?: never
        readonly requiresUnion?: never
        readonly returns?: never
      }
    | {
        readonly targets?: never
        readonly requiresDataStructure?: never
        readonly requiresDecoratorSignature: true
        readonly requiresStringLiteralConstant?: never
        readonly requiresUnion?: never
        readonly returns?: never
      }
    | {
        readonly targets?: never
        readonly requiresDecoratorSignature?: never
        readonly requiresStringLiteralConstant: true
        readonly requiresDataStructure?: never
        readonly requiresUnion?: never
        readonly returns?: never
      }
    | {
        readonly targets?: never
        readonly requiresDataStructure: true
        readonly requiresDecoratorSignature?: never
        readonly requiresStringLiteralConstant?: never
        readonly requiresUnion?: never
        readonly returns?: never
      }
    | {
        readonly targets?: never
        readonly requiresDataStructure?: never
        readonly requiresDecoratorSignature?: never
        readonly requiresStringLiteralConstant?: never
        readonly requiresUnion: true
        readonly returns?: never
      }
    | {
        readonly requiresDataStructure?: never
        readonly requiresDecoratorSignature?: never
        readonly requiresStringLiteralConstant?: never
        readonly requiresUnion?: never
        readonly returns: readonly ReturnShape<R>[]
        readonly targets?: never
      }
  )

interface BuiltRoleDefinition<N extends string = string> extends RoleConstraints {
  readonly name: N
  readonly requiresDecoratorSignature?: true
  readonly requiresDataStructure?: true
  readonly requiresStringLiteralConstant?: true
  readonly requiresUnion?: true
  readonly returns?: readonly ReturnShape[]
  readonly targets: readonly RoleTarget[]
}

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
  declare readonly requiresDecoratorSignature?: true
  declare readonly requiresDataStructure?: true
  declare readonly requiresStringLiteralConstant?: true
  declare readonly requiresUnion?: true
  declare readonly returns?: readonly ReturnShape[]
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
    targets: inferredTargets(options),
  })
}

/** @riviere-role domain-service */
export function createRoleFactory<R extends string>() {
  return <const N extends R>(name: N, options: RoleOptions<R>): BuiltRole<N> =>
    BuiltRole.parse({
      name,
      ...options,
      targets: inferredTargets(options),
    })
}

function inferredTargets(options: RoleOptions): readonly RoleTarget[] {
  if (options.requiresDecoratorSignature === true) {
    return ['function']
  }
  if (options.requiresStringLiteralConstant === true) {
    return ['variable']
  }
  if (options.requiresDataStructure === true) {
    return ['interface']
  }
  if (options.requiresUnion === true) {
    return ['type-alias']
  }
  if (Array.isArray(options.returns)) {
    return ['function']
  }
  if (options.targets !== undefined) {
    return options.targets
  }
  throw new TypeError('A role must declare a target or semantic rule.')
}

interface RoleEnforcementConfigurationInput<R extends string> {
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
  readonly unassignedPackages?: readonly string[]
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

interface RoleEnforcementConfigurationDefinition {
  readonly assignedPackages: readonly string[]
  readonly ignorePatterns: readonly string[]
  readonly importAliases?: Readonly<Record<string, string>>
  readonly include: readonly string[]
  readonly locationHierarchy: readonly BuiltLocationNode[]
  readonly roleDefinitionsDir: string
  readonly roles: readonly BuiltRole[]
  readonly unassignedPackages: readonly string[]
}

type RoleEnforcementConfigurationParseResult =
  | { readonly success: true; readonly data: RoleEnforcementConfiguration }
  | { readonly success: false; readonly error: RoleEnforcementExecutionError }

type ValidRoleEnforcementConfigurationParseResult = {
  readonly success: true
  readonly data: RoleEnforcementConfiguration
}

/** @riviere-role value-object */
export class RoleEnforcementConfiguration {
  declare private readonly brand: 'RoleEnforcementConfiguration'

  declare readonly assignedPackages: readonly string[]
  declare readonly ignorePatterns: readonly string[]
  declare readonly importAliases?: Readonly<Record<string, string>>
  declare readonly include: readonly string[]
  declare readonly locationHierarchy: readonly BuiltLocationNode[]
  declare readonly roleDefinitionsDir: string
  declare readonly roles: readonly BuiltRole[]
  declare readonly unassignedPackages: readonly string[]

  private constructor(definition: RoleEnforcementConfigurationDefinition | object) {
    Object.assign(this, definition)
  }

  static parse(
    value: RoleEnforcementConfigurationDefinition,
  ): ValidRoleEnforcementConfigurationParseResult
  static parse(value: unknown): RoleEnforcementConfigurationParseResult
  static parse(value: unknown): RoleEnforcementConfigurationParseResult {
    if (typeof value !== 'object' || value === null) {
      return {
        success: false,
        error: new RoleEnforcementExecutionError(
          'Role enforcement configuration must be an object.',
        ),
      }
    }

    const required = [
      'assignedPackages',
      'include',
      'ignorePatterns',
      'locationHierarchy',
      'roles',
      'roleDefinitionsDir',
      'unassignedPackages',
    ]
    for (const key of required) {
      if (!(key in value)) {
        return {
          success: false,
          error: new RoleEnforcementExecutionError(
            `Role enforcement configuration is missing required property '${key}'.`,
          ),
        }
      }
    }

    return {
      success: true,
      data: new RoleEnforcementConfiguration(value),
    }
  }

  validateWorkspacePackages(workspacePackages: readonly string[]): void {
    for (const packagePath of workspacePackages) {
      const assignmentCount = this.assignedPackages.filter(
        (assignedPackage) => assignedPackage === packagePath,
      ).length
      const isUnassigned = this.unassignedPackages.includes(packagePath)

      if (assignmentCount === 0 && !isUnassigned) {
        throw new RoleEnforcementExecutionError(
          `Workspace package '${packagePath}' has no role-enforcement configuration and is not explicitly unassigned.`,
        )
      }
      if (assignmentCount > 1) {
        throw new RoleEnforcementExecutionError(
          `Workspace package '${packagePath}' is assigned to more than one role-enforcement configuration.`,
        )
      }
      if (assignmentCount === 1 && isUnassigned) {
        throw new RoleEnforcementExecutionError(
          `Workspace package '${packagePath}' cannot have a role-enforcement configuration and be explicitly unassigned.`,
        )
      }
    }
  }
}

/** @riviere-role domain-service */
export function roleEnforcementConfiguration<const R extends string>(
  input: RoleEnforcementConfigurationInput<R>,
): RoleEnforcementConfiguration {
  const assignedConfigurations = Object.values(input.configurations)
  const assignedPackages = assignedConfigurations.flatMap((configuration) => configuration.packages)
  return RoleEnforcementConfiguration.parse({
    assignedPackages,
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
    unassignedPackages: input.unassignedPackages ?? [],
  }).data
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
    ...(definition.dependencyRules !== undefined && {
      dependencyRules: definition.dependencyRules,
    }),
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
