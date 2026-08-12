interface LocationImportRule<R extends string> {
  readonly location: string
  readonly roles?: readonly R[]
}

interface LocationDependencyRules<R extends string> {
  readonly canImportSiblings?: false
  readonly importableFrom?: 'withinParentLocation'
  readonly locations?: readonly LocationImportRule<R>[]
}

interface FluentLocationOptions<R extends string> {
  readonly allowAnySubLocations?: true
  readonly dependencyRules?: LocationDependencyRules<R>
}

interface FluentLocationDefinition<R extends string> {
  readonly allowAnySubLocations: boolean
  readonly allowedRoles: readonly R[]
  readonly dependencyRules?: LocationDependencyRules<R>
  readonly path: string
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

  get dependencyRules(): LocationDependencyRules<R> | undefined {
    return this.definition.dependencyRules
  }

  get path(): string {
    return this.definition.path
  }

  get subLocations(): readonly LocationBuilder<R>[] {
    return this.definition.subLocations
  }

  subLocation(location: LocationBuilder<R>): LocationBuilder<R>
  subLocation(
    path: string,
    roles: readonly R[],
    options?: FluentLocationOptions<R>,
  ): LocationBuilder<R>
  subLocation(
    pathOrLocation: string | LocationBuilder<R>,
    roles: readonly R[] = [],
    options?: FluentLocationOptions<R>,
  ): LocationBuilder<R> {
    const child =
      typeof pathOrLocation === 'string'
        ? LocationBuilder.parse({
          allowAnySubLocations: options?.allowAnySubLocations === true,
          allowedRoles: roles,
          ...(options?.dependencyRules === undefined
            ? {}
            : { dependencyRules: options.dependencyRules }),
          path: pathOrLocation,
          subLocations: [],
        })
        : pathOrLocation
    return LocationBuilder.parse({
      ...this.definition,
      subLocations: [...this.definition.subLocations, child],
    })
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
  options?: FluentLocationOptions<R>,
): LocationBuilder<R>
export function location<R extends string>(
  path: string,
  options: FluentLocationOptions<R>,
): LocationBuilder<R>
/** @riviere-role domain-service */
export function location<R extends string>(
  path: string,
  rolesOrOptions?: readonly R[] | FluentLocationOptions<R>,
  options?: FluentLocationOptions<R>,
): LocationBuilder<R> {
  const hasRoles = isRoleList(rolesOrOptions)
  const roles = hasRoles ? rolesOrOptions : []
  const resolvedOptions = hasRoles ? options : rolesOrOptions
  return LocationBuilder.parse({
    allowAnySubLocations: resolvedOptions?.allowAnySubLocations === true,
    allowedRoles: roles,
    ...(resolvedOptions?.dependencyRules === undefined
      ? {}
      : { dependencyRules: resolvedOptions.dependencyRules }),
    path,
    subLocations: [],
  })
}

function isRoleList<R extends string>(
  value: readonly R[] | FluentLocationOptions<R> | undefined,
): value is readonly R[] {
  return Array.isArray(value)
}

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
