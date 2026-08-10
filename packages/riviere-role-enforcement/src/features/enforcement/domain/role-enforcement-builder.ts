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

interface SubLocationEntry {
  readonly allowedRoles: readonly string[]
  readonly dependencyRule?: BuiltLocationDependencyRule
  readonly forbiddenImports?: readonly string[]
  readonly path: string
}

/** @riviere-role value-object */
export interface BuiltLocation {
  readonly basePath: string
  readonly subLocations: readonly SubLocationEntry[]
}

/** @riviere-role value-object */
export interface BuiltLocationDependencyRule {
  readonly enforceDependencies: boolean
  readonly locationName: string
  readonly mayImportExternalPackages: boolean
  readonly mayImportLocations: readonly string[]
}

interface LocationDependencyRuleOptions {
  readonly enforceDependencies?: boolean
  readonly locationName: string
  readonly mayImportExternalPackages?: boolean
  readonly mayImportLocations: readonly string[]
}

interface SubLocationOptions {
  readonly dependencyRule?: LocationDependencyRuleOptions
  readonly forbiddenImports?: readonly string[]
}

/** @riviere-role value-object */
export type LocationBuilder<R extends string> = BuiltLocation & {
  readonly subLocation: (
    path: string,
    allowedRoles: readonly R[],
    options?: SubLocationOptions,
  ) => LocationBuilder<R>
}

export function location<R extends string>(basePath: string): LocationBuilder<R>
export function location<R extends string>(
  basePath: string,
  allowedRoles: readonly R[],
  options?: SubLocationOptions,
): BuiltLocation
/** @riviere-role domain-service */
export function location<R extends string>(
  basePath: string,
  allowedRoles?: readonly R[],
  options?: SubLocationOptions,
): BuiltLocation | LocationBuilder<R> {
  if (allowedRoles !== undefined) {
    return {
      basePath,
      subLocations: [buildSubLocation('', allowedRoles, options)],
    }
  }

  return createLocationBuilder<R>(basePath, [])
}

function createLocationBuilder<R extends string>(
  basePath: string,
  subLocations: readonly SubLocationEntry[],
): LocationBuilder<R> {
  return {
    basePath,
    subLocations,
    subLocation(
      path: string,
      allowedRoles: readonly R[],
      options?: SubLocationOptions,
    ): LocationBuilder<R> {
      return createLocationBuilder(basePath, [
        ...subLocations,
        buildSubLocation(path, allowedRoles, options),
      ])
    },
  }
}

function buildSubLocation(
  path: string,
  allowedRoles: readonly string[],
  options?: SubLocationOptions,
): SubLocationEntry {
  return {
    allowedRoles,
    path,
    ...(options?.dependencyRule !== undefined && {
      dependencyRule: {
        enforceDependencies: options.dependencyRule.enforceDependencies ?? true,
        locationName: options.dependencyRule.locationName,
        mayImportExternalPackages: options.dependencyRule.mayImportExternalPackages ?? true,
        mayImportLocations: options.dependencyRule.mayImportLocations,
      },
    }),
    ...(options?.forbiddenImports !== undefined && { forbiddenImports: options.forbiddenImports }),
  }
}

interface RoleEnforcementInput<R extends string> {
  readonly canonicalConfigurationsFile: string
  readonly ignorePatterns: readonly string[]
  readonly locations: readonly BuiltLocation[]
  readonly packages: readonly string[]
  readonly roleDefinitionsDir: string
  readonly roles: readonly BuiltRole<R>[]
  readonly workspacePackageSources?: Record<string, string>
}

interface LocationEntry {
  readonly allowedRoles: readonly string[]
  readonly dependencyRule?: BuiltLocationDependencyRule
  readonly forbiddenImports?: readonly string[]
  readonly paths: readonly string[]
}

/** @riviere-role value-object */
export interface RoleEnforcementResult {
  readonly ignorePatterns: readonly string[]
  readonly include: readonly string[]
  readonly layers: Record<string, LocationEntry>
  readonly roleDefinitionsDir: string
  readonly roles: readonly BuiltRole[]
  readonly workspacePackageSources?: Record<string, string>
}

/** @riviere-role domain-service */
export function roleEnforcement<const R extends string>(
  input: RoleEnforcementInput<R>,
): RoleEnforcementResult {
  const layers: Record<string, LocationEntry> = {}

  for (const pkg of input.packages) {
    for (const loc of input.locations) {
      for (const sub of loc.subLocations) {
        const relativePath = sub.path === '' ? loc.basePath : `${loc.basePath}${sub.path}`
        const fullPath = `${pkg}/${relativePath}`
        const resolvedPath = resolvePathTemplate(fullPath)
        layers[fullPath] = {
          allowedRoles: sub.allowedRoles,
          paths: [resolvedPath],
          ...(sub.dependencyRule !== undefined && { dependencyRule: sub.dependencyRule }),
          ...(sub.forbiddenImports !== undefined && { forbiddenImports: sub.forbiddenImports }),
        }
      }
    }
  }

  return {
    ignorePatterns: input.ignorePatterns,
    include: input.packages.map((pkg) => `${pkg}/src/**/*.ts`),
    layers,
    roleDefinitionsDir: input.roleDefinitionsDir,
    roles: input.roles,
    ...(input.workspacePackageSources !== undefined && {workspacePackageSources: input.workspacePackageSources,}),
  }
}

function resolvePathTemplate(templatePath: string): string {
  return templatePath
    .split('/')
    .map((segment) => (segment.startsWith('{') && segment.endsWith('}') ? '*' : segment))
    .join('/')
}
