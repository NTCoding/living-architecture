export type RoleTarget = 'class' | 'function' | 'interface' | 'type-alias'

interface RoleOptions {
  readonly targets: readonly RoleTarget[]
  readonly allowedInputs?: readonly string[]
  readonly allowedNames?: readonly string[]
  readonly allowedOutputs?: readonly string[]
  readonly forbiddenDependencies?: readonly string[]
  readonly nameMatches?: string
  readonly minPublicMethods?: number
}

export interface BuiltRole<N extends string = string> {
  readonly name: N
  readonly targets: readonly RoleTarget[]
  readonly allowedInputs?: readonly string[]
  readonly allowedNames?: readonly string[]
  readonly allowedOutputs?: readonly string[]
  readonly forbiddenDependencies?: readonly string[]
  readonly nameMatches?: string
  readonly minPublicMethods?: number
}

export function role<const N extends string>(name: N, options: RoleOptions): BuiltRole<N> {
  return {
    name,
    ...options,
  }
}

interface SubLocationEntry {
  readonly allowedRoles: readonly string[]
  readonly forbiddenImports?: readonly string[]
  readonly path: string
}

export interface BuiltLocation {
  readonly basePath: string
  readonly subLocations: readonly SubLocationEntry[]
}

interface SubLocationOptions {readonly forbiddenImports?: readonly string[]}

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
): BuiltLocation
export function location<R extends string>(
  basePath: string,
  allowedRoles?: readonly R[],
): BuiltLocation | LocationBuilder<R> {
  if (allowedRoles !== undefined) {
    return {
      basePath,
      subLocations: [
        {
          allowedRoles,
          path: '',
        },
      ],
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
        {
          allowedRoles,
          path,
          ...(options?.forbiddenImports !== undefined && {forbiddenImports: options.forbiddenImports,}),
        },
      ])
    },
  }
}

interface RoleEnforcementInput<R extends string> {
  readonly canonicalConfigurationsFile: string
  readonly ignorePatterns: readonly string[]
  readonly locations: readonly BuiltLocation[]
  readonly packages: readonly string[]
  readonly roleDefinitionsDir: string
  readonly roles: readonly BuiltRole<R>[]
}

interface LayerEntry {
  readonly allowedRoles: readonly string[]
  readonly forbiddenImports?: readonly string[]
  readonly paths: readonly string[]
}

export interface RoleEnforcementResult {
  readonly ignorePatterns: readonly string[]
  readonly include: readonly string[]
  readonly layers: Record<string, LayerEntry>
  readonly roleDefinitionsDir: string
  readonly roles: readonly BuiltRole[]
}

export function roleEnforcement<const R extends string>(
  input: RoleEnforcementInput<R>,
): RoleEnforcementResult {
  const layers: Record<string, LayerEntry> = {}

  for (const pkg of input.packages) {
    for (const loc of input.locations) {
      for (const sub of loc.subLocations) {
        const relativePath = sub.path === '' ? loc.basePath : `${loc.basePath}${sub.path}`
        const fullPath = `${pkg}/${relativePath}`
        const resolvedPath = resolvePathTemplate(fullPath)
        layers[fullPath] = {
          allowedRoles: sub.allowedRoles,
          paths: [resolvedPath],
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
  }
}

function resolvePathTemplate(templatePath: string): string {
  return templatePath
    .split('/')
    .map((segment) => (segment.startsWith('{') && segment.endsWith('}') ? '*' : segment))
    .join('/')
}
