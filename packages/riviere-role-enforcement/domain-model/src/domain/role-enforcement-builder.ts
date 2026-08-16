import { type LocationBuilder, type LocationConfiguration } from './location-configuration'
import { assignPackageConfigurations } from './assign-package-configurations'
import { RoleEnforcementExecutionError } from './role-enforcement-execution-error'
import { validateRoleConfiguration } from './validate-role-configuration'
import { validateNoRepeatedInheritedImports } from './validate-location-import-rules'
import { InvalidRoleDefinitionError } from './role-configuration-errors'

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
        readonly mustBeDataStructure?: never
        readonly requiresDecoratorSignature?: never
        readonly requiresStringLiteralConstant?: never
        readonly requiresUnion?: never
        readonly returns?: never
      }
    | {
        readonly targets?: never
        readonly mustBeDataStructure?: never
        readonly requiresDecoratorSignature: true
        readonly requiresStringLiteralConstant?: never
        readonly requiresUnion?: never
        readonly returns?: never
      }
    | {
        readonly targets?: never
        readonly requiresDecoratorSignature?: never
        readonly requiresStringLiteralConstant: true
        readonly mustBeDataStructure?: never
        readonly requiresUnion?: never
        readonly returns?: never
      }
    | {
        readonly targets?: readonly ('interface' | 'type-alias')[]
        readonly mustBeDataStructure: true
        readonly requiresDecoratorSignature?: never
        readonly requiresStringLiteralConstant?: never
        readonly requiresUnion?: never
        readonly returns?: never
      }
    | {
        readonly targets?: never
        readonly mustBeDataStructure?: never
        readonly requiresDecoratorSignature?: never
        readonly requiresStringLiteralConstant?: never
        readonly requiresUnion: true
        readonly returns?: never
      }
    | {
        readonly mustBeDataStructure?: never
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
  readonly mustBeDataStructure?: true
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
  declare readonly mustBeDataStructure?: true
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

function inferredTargets(options: RoleOptions): readonly RoleTarget[] {
  if (options.requiresDecoratorSignature === true) {
    return ['function']
  }
  if (options.requiresStringLiteralConstant === true) {
    return ['variable']
  }
  if (options.mustBeDataStructure === true) {
    return options.targets ?? ['interface', 'type-alias']
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
  throw new InvalidRoleDefinitionError('A role must declare a target or semantic rule.')
}

interface RoleEnforcementConfigurationInput<R extends string> {
  readonly configurations: Readonly<
    Record<
      string,
      {
        readonly locations: LocationConfiguration<R>
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
  readonly importRules?: LocationBuilder<string>['importRules']
  readonly id: string
  readonly name: string
  readonly packagePath: string
  readonly parentId?: string
  readonly pathTemplate: string
  readonly roleEnforcement: boolean
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
      const isUnassigned = this.unassignedPackages.includes(packagePath)
      if (isUnassigned) {
        continue
      }
      const assignmentCount = this.assignedPackages.filter((assignedPackage) =>
        packagePatternMatches(assignedPackage, packagePath),
      ).length

      if (assignmentCount === 0) {
        throw new RoleEnforcementExecutionError(
          `Workspace package '${packagePath}' has no role-enforcement configuration and is not explicitly unassigned.`,
        )
      }
      if (assignmentCount > 1) {
        throw new RoleEnforcementExecutionError(
          `Workspace package '${packagePath}' is assigned to more than one role-enforcement configuration.`,
        )
      }
    }
  }
}

/** @riviere-role domain-service */
export function roleEnforcementConfiguration<const R extends string>(
  input: RoleEnforcementConfigurationInput<R>,
): RoleEnforcementConfiguration {
  const assignedConfigurations = assignPackageConfigurations(input.configurations)
  const assignedPackages = assignedConfigurations.map(([packagePattern]) => packagePattern)
  const unassignedPackages = input.unassignedPackages ?? []
  const locationHierarchy = assignedConfigurations.flatMap(([packagePattern, configuration]) =>
    buildFluentLocationHierarchy(packagePattern, configuration.locations),
  )
  validateNoRepeatedInheritedImports(locationHierarchy)
  validateRoleConfiguration(input.roles, locationHierarchy)
  return RoleEnforcementConfiguration.parse({
    assignedPackages,
    ignorePatterns: [
      ...input.ignorePatterns,
      ...unassignedPackages.map((packagePath) => `${packagePath}/src/**`),
    ],
    ...(input.importAliases !== undefined && { importAliases: input.importAliases }),
    include: assignedConfigurations.flatMap(([packagePattern]) => [
      `${toGlobPattern(packagePattern)}/src/**/*.ts`,
      `${toGlobPattern(packagePattern)}/src/**/*.tsx`,
    ]),
    locationHierarchy,
    roleDefinitionsDir: input.roleDefinitionsDir,
    roles: input.roles,
    unassignedPackages,
  }).data
}

function buildFluentLocationHierarchy<R extends string>(
  packagePattern: string,
  configuration: LocationConfiguration<R>,
): BuiltLocationNode[] {
  const sourceRoot = buildSourceRoot(packagePattern)
  return [
    sourceRoot,
    ...configuration.locations.flatMap((root) =>
      buildFluentLocation(root, packagePattern, sourceRoot),
    ),
  ]
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
    roleEnforcement: true,
  }
}

function buildFluentLocationNode<R extends string>(
  definition: LocationBuilder<R>,
  packagePath: string,
  parentPathTemplate: string,
  locationName: string,
  isConfigurationRoot = false,
): BuiltLocationNode[] {
  const pathTemplate = `${parentPathTemplate}/${normalizeLocationPath(definition.path)}`
  const id = `${packagePath}:${pathTemplate}`
  const node: BuiltLocationNode = {
    allowAnySubLocations: definition.allowAnySubLocations,
    allowedRoles: definition.allowedRoles,
    ...(definition.importRules !== undefined && {
      importRules: definition.importRules,
    }),
    id,
    name: locationName,
    packagePath,
    parentId: `${packagePath}:${parentPathTemplate}`,
    pathTemplate,
    roleEnforcement: definition.roleEnforcement,
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

function toGlobPattern(packagePattern: string): string {
  return packagePattern
    .split('/')
    .map((segment) => (segment.startsWith('{') && segment.endsWith('}') ? '*' : segment))
    .join('/')
}

function packagePatternMatches(packagePattern: string, packagePath: string): boolean {
  const patternSegments = packagePattern.split('/')
  const pathSegments = packagePath.split('/')
  return (
    patternSegments.length === pathSegments.length &&
    patternSegments.every(
      (segment, index) =>
        (segment.startsWith('{') && segment.endsWith('}')) || segment === pathSegments[index],
    )
  )
}
