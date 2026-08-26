import type { LocationConfiguration } from './location-configuration'
import { LocationHierarchy } from './location-hierarchy'
import { PackageConfigurationAssignments } from './package-configuration-assignments'
import { RoleEnforcementExecutionError } from './role-enforcement-execution-error'
import { RoleCatalogue } from './role-catalogue'
import { InvalidRoleDefinitionError } from './role-configuration-errors'
import { type ApprovedInstance, RoleConstraints, RoleTarget } from './role-constraints'
import { PackageManifestRequirements } from './package-manifest-requirements'
export { location, locationConfiguration } from './location-configuration'
export type { LocationBuilder, LocationConfiguration } from './location-configuration'
interface ReturnShape<R extends string = string> {
  readonly success: boolean
  readonly '*': R | '*'
}

type RoleConstraintInput = Parameters<typeof RoleConstraints.parse>[0]
type RoleTargetInput = Parameters<typeof RoleTarget.parse>[0]

type RoleOptions<R extends string = string> = RoleConstraintInput &
  (
    | {
        readonly targets: readonly RoleTargetInput[]
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
        readonly targets?: readonly Extract<RoleTargetInput, 'interface' | 'type-alias'>[]
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

interface BuiltRoleDefinition<N extends string = string> {
  readonly constraints: RoleConstraints
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
  declare readonly targets: readonly RoleTargetInput[]
  declare readonly allowedInputs?: readonly string[]
  declare readonly allowedNames?: readonly string[]
  declare readonly allowedOutputs?: readonly string[]
  declare readonly approvedInstances?: readonly ApprovedInstance[]
  declare readonly forbiddenCallableDataMembers?: true
  declare readonly forbiddenInlineCallableMembers?: true
  declare readonly forbiddenInlineFunctionImplementations?: true
  declare readonly requiresRoleDependencies?: true
  declare readonly forbiddenSupertypes?: readonly string[] | true
  declare readonly forbiddenDependencies?: readonly string[]
  declare readonly allowedDependencyRoles?: readonly string[]
  declare readonly allowedDependentRoles?: readonly string[]
  declare readonly allowedCollaboratorRoles?: readonly string[]
  declare readonly allowsUnclassifiedInputs?: true
  declare readonly forbiddenImportedFunctionCalls?: true
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
  declare readonly requiresPrivateDataMembers?: true
  declare readonly requiresReadonlyDataMembers?: true
  declare readonly requiresJustification?: string
  declare readonly maxPublicMethods?: number
  declare readonly nameMatches?: string
  declare readonly minPublicMethods?: number

  private constructor(definition: BuiltRoleDefinition<N>) {
    Object.assign(this, definition.constraints, {
      name: definition.name,
      targets: definition.targets.map((target) => target.value),
    })
  }

  static parse<N extends string>(definition: BuiltRoleDefinition<N>): BuiltRole<N> {
    return new BuiltRole(definition)
  }
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification PLACEHOLDER: Added before justification rule introduced.
 */
export function role<const N extends string>(name: N, options: RoleOptions): BuiltRole<N> {
  return BuiltRole.parse({
    constraints: RoleConstraints.parse(options),
    name,
    targets: inferredTargets(options),
  })
}

function inferredTargets(options: RoleOptions): readonly RoleTarget[] {
  if (options.requiresDecoratorSignature === true) {
    return [RoleTarget.parse('function')]
  }
  if (options.requiresStringLiteralConstant === true) {
    return [RoleTarget.parse('variable')]
  }
  if (options.mustBeDataStructure === true) {
    return (options.targets ?? ['interface', 'type-alias']).map((target) =>
      RoleTarget.parse(target),
    )
  }
  if (options.requiresUnion === true) {
    return [RoleTarget.parse('type-alias')]
  }
  if (Array.isArray(options.returns)) {
    return [RoleTarget.parse('function')]
  }
  if (options.targets !== undefined) {
    return options.targets.map((target) => RoleTarget.parse(target))
  }
  throw new InvalidRoleDefinitionError('A role must declare a target or semantic rule.')
}

interface RoleEnforcementConfigurationInput<R extends string> {
  readonly configurations: Readonly<
    Record<
      string,
      {
        readonly locations: LocationConfiguration<R>
        readonly packageManifest?: {
          readonly requiredNonEmptyStringProperties: readonly string[]
        }
      }
    >
  >
  readonly ignorePatterns: readonly string[]
  readonly importAliases?: Readonly<Record<string, string>>
  readonly roleDefinitionsDir: string
  readonly roles: readonly BuiltRole<R>[]
  readonly unassignedPackages?: readonly string[]
}

interface WorkspacePackage {
  readonly manifest: unknown
  readonly path: string
}

interface RoleEnforcementConfigurationDefinition {
  readonly assignedPackages: readonly string[]
  readonly ignorePatterns: readonly string[]
  readonly importAliases?: Readonly<Record<string, string>>
  readonly include: readonly string[]
  readonly locationHierarchy: LocationHierarchy['values']
  readonly packageManifestRequirements: PackageManifestRequirements
  readonly roleDefinitionsDir: string
  readonly roles: readonly BuiltRole[]
  readonly unassignedPackages: readonly string[]
}

type RoleEnforcementConfigurationParseResult =
  | { readonly success: true; readonly data: RoleEnforcementConfiguration }
  | { readonly success: false; readonly error: RoleEnforcementExecutionError }

/** @riviere-role value-object */
export class RoleEnforcementConfiguration {
  declare private readonly brand: 'RoleEnforcementConfiguration'

  declare readonly assignedPackages: readonly string[]
  declare readonly ignorePatterns: readonly string[]
  declare readonly importAliases?: Readonly<Record<string, string>>
  declare readonly include: readonly string[]
  declare readonly locationHierarchy: LocationHierarchy['values']
  declare readonly packageManifestRequirements: PackageManifestRequirements
  declare readonly roleDefinitionsDir: string
  declare readonly roles: readonly BuiltRole[]
  declare readonly unassignedPackages: readonly string[]

  private constructor(definition: RoleEnforcementConfigurationDefinition | object) {
    Object.assign(this, definition)
  }

  static parse<const R extends string>(
    input: RoleEnforcementConfigurationInput<R>,
  ): RoleEnforcementConfiguration {
    const packageAssignments = PackageConfigurationAssignments.parse(input.configurations)
    const locationHierarchy = LocationHierarchy.parse(packageAssignments)
    const roleCatalogue = RoleCatalogue.parse(input.roles, locationHierarchy)
    const unassignedPackages = input.unassignedPackages ?? []
    return new RoleEnforcementConfiguration({
      assignedPackages: packageAssignments.assignedPackages(),
      ignorePatterns: [
        ...input.ignorePatterns,
        ...unassignedPackages.map((packagePath) => `${packagePath}/src/**`),
      ],
      ...(input.importAliases === undefined ? {} : { importAliases: input.importAliases }),
      include: packageAssignments.sourceFilePatterns(),
      locationHierarchy: locationHierarchy.values,
      packageManifestRequirements: packageAssignments.packageManifestRequirements(),
      roleDefinitionsDir: input.roleDefinitionsDir,
      roles: roleCatalogue.values,
      unassignedPackages,
    })
  }

  static parseFromState(
    value: RoleEnforcementConfigurationDefinition,
  ): RoleEnforcementConfiguration {
    return new RoleEnforcementConfiguration(value)
  }

  static parseFromUnknown(value: unknown): RoleEnforcementConfigurationParseResult {
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
      'packageManifestRequirements',
      'roles',
      'roleDefinitionsDir',
      'unassignedPackages',
    ]
    for (const key of required) {
      if (!Object.hasOwn(value, key)) {
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

  validateWorkspacePackages(workspacePackages: readonly WorkspacePackage[]): void {
    for (const workspacePackage of workspacePackages) {
      const packagePath = workspacePackage.path
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
      this.packageManifestRequirements.validate(workspacePackage)
    }
  }
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
