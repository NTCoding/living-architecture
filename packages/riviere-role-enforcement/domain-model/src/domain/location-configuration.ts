type AllowedLocation<R extends string> = string | Readonly<Record<string, readonly R[]>>

interface AllowedImportScopes<R extends string> {
  readonly anySubdomain?: readonly AllowedLocation<R>[]
  readonly otherSubdomain?: readonly AllowedLocation<R>[]
  readonly ownSubdomain?: readonly AllowedLocation<R>[]
  readonly root?: readonly AllowedLocation<R>[]
  readonly sibling?: readonly AllowedLocation<R>[]
}

interface LocationImportRules<R extends string> {
  readonly allow?: AllowedImportScopes<R>
  readonly canImportSiblings?: false
  readonly inheritParentImportRules?: false
  readonly importableFrom?: 'withinParentLocation'
}

interface LocationNodeOptions<R extends string> {
  readonly allowAnySubLocations?: true
  readonly importRules?: LocationImportRules<R>
  readonly roleEnforcement?: false
}

interface LocationNodeInput<R extends string> extends LocationNodeOptions<R> {
  readonly roles?: readonly R[]
  readonly [key: string]:
    | readonly R[]
    | LocationImportRules<R>
    | LocationNodeInput<R>
    | boolean
    | undefined
}

interface FluentLocationDefinition<R extends string> {
  readonly allowAnySubLocations: boolean
  readonly allowedRoles: readonly R[]
  readonly importRules?: LocationImportRules<R>
  readonly path: string
  readonly roleEnforcement: boolean
  readonly subLocations: readonly LocationBuilder<R>[]
}

/** @riviere-role value-object */
export class LocationBuilder<R extends string> {
  declare private readonly brand: 'LocationBuilder'

  private constructor(private readonly definition: FluentLocationDefinition<R>) {}

  static parse<R extends string>(definition: FluentLocationDefinition<R>): LocationBuilder<R> {
    assertNoExplicitSubLocationsInsideUnrestrictedLocation(definition)
    return new LocationBuilder(definition)
  }

  get allowAnySubLocations(): boolean {
    return this.definition.allowAnySubLocations
  }

  get allowedRoles(): readonly R[] {
    return this.definition.allowedRoles
  }

  get importRules(): LocationImportRules<R> | undefined {
    return this.definition.importRules
  }

  get path(): string {
    return this.definition.path
  }

  get roleEnforcement(): boolean {
    return this.definition.roleEnforcement
  }

  get subLocations(): readonly LocationBuilder<R>[] {
    return this.definition.subLocations
  }
}

/** @riviere-role value-object */
export class LocationConfiguration<R extends string> {
  declare private readonly brand: 'LocationConfiguration'

  private constructor(readonly locations: readonly LocationBuilder<R>[]) {}

  static parse<R extends string>(
    locations: readonly LocationBuilder<R>[],
  ): LocationConfiguration<R> {
    return new LocationConfiguration(locations)
  }
}

export function location<R extends string>(path: string): LocationBuilder<R>
export function location<R extends string>(
  path: string,
  roles: readonly R[],
  node?: LocationNodeInput<R>,
): LocationBuilder<R>
export function location<R extends string>(
  path: string,
  node: LocationNodeInput<R>,
): LocationBuilder<R>
/** @riviere-role domain-service */
export function location<R extends string>(
  path: string,
  rolesOrNode?: readonly R[] | LocationNodeInput<R>,
  node?: LocationNodeInput<R>,
): LocationBuilder<R> {
  const hasRoles = isRoleList(rolesOrNode)
  return buildLocation(path, hasRoles ? rolesOrNode : [], hasRoles ? node : rolesOrNode)
}

function isRoleList<R extends string>(value: unknown): value is readonly R[] {
  return Array.isArray(value)
}

function buildLocation<R extends string>(
  path: string,
  roles: readonly R[],
  node: LocationNodeInput<R> | undefined,
): LocationBuilder<R> {
  return LocationBuilder.parse({
    allowAnySubLocations: node?.allowAnySubLocations === true,
    allowedRoles: roles,
    ...(node?.importRules === undefined ? {} : { importRules: node.importRules }),
    path,
    roleEnforcement: node?.roleEnforcement !== false,
    subLocations: Object.entries(node ?? {})
      .filter(([key]) => !reservedLocationKeys.has(key))
      .map(([childPath, child]) => buildChildLocation(childPath, child)),
  })
}

function buildChildLocation<R extends string>(path: string, child: unknown): LocationBuilder<R> {
  if (isRoleList<R>(child)) {
    return buildLocation(path, child, undefined)
  }
  if (!isLocationNodeInput<R>(child)) {
    throw new TypeError(`Sub-location '${path}' must define roles or sub-locations.`)
  }
  return buildLocation(path, child.roles ?? [], child)
}

function isLocationNodeInput<R extends string>(value: unknown): value is LocationNodeInput<R> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const reservedLocationKeys = new Set([
  'allowAnySubLocations',
  'importRules',
  'roleEnforcement',
  'roles',
])

/** @riviere-role domain-service */
export function locationConfiguration<R extends string>(
  ...locations: readonly LocationBuilder<R>[]
): LocationConfiguration<R> {
  return LocationConfiguration.parse(locations)
}

function assertNoExplicitSubLocationsInsideUnrestrictedLocation<R extends string>(
  definition: FluentLocationDefinition<R>,
): void {
  if (definition.allowAnySubLocations && definition.subLocations.length > 0) {
    throw new TypeError(
      `Location '${definition.path}' cannot define both allowAnySubLocations and subLocations`,
    )
  }

  const unrestrictedLocation = definition.subLocations.find(
    (candidate) =>
      candidate.allowAnySubLocations &&
      definition.subLocations.some(
        (possibleChild) =>
          possibleChild !== candidate &&
          normalizePath(possibleChild.path).startsWith(`${normalizePath(candidate.path)}/`),
      ),
  )
  if (unrestrictedLocation !== undefined) {
    throw new TypeError(
      `Location '${unrestrictedLocation.path}' cannot define both allowAnySubLocations and subLocations`,
    )
  }
}

function normalizePath(path: string): string {
  return path.split('/').filter(Boolean).join('/')
}
