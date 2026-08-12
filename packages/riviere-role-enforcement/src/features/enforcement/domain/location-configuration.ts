/** @riviere-role value-object */
export interface LocationImportRule<R extends string> {
  readonly location: string
  readonly roles?: readonly R[]
}

/** @riviere-role value-object */
export interface LocationDependencyRules<R extends string> {
  readonly canImportSiblings?: false
  readonly importableFrom?: 'withinParentLocation'
  readonly locations?: readonly LocationImportRule<R>[]
}

/** @riviere-role value-object */
export interface FluentLocationOptions<R extends string> {
  readonly allowAnySubLocations?: true
  readonly dependencyRules?: LocationDependencyRules<R>
}

/** @riviere-role value-object */
export interface FluentLocationDefinition<R extends string> {
  readonly allowAnySubLocations: boolean
  readonly allowedRoles: readonly R[]
  readonly dependencyRules?: LocationDependencyRules<R>
  readonly path: string
  readonly rolesSpecified: boolean
  readonly subLocations: readonly LocationBuilder<R>[]
}

/** @riviere-role value-object */
export type LocationBuilder<R extends string> = FluentLocationDefinition<R> & {
  readonly subLocation: {
    (location: LocationBuilder<R>): LocationBuilder<R>
    (path: string, roles: readonly R[], options?: FluentLocationOptions<R>): LocationBuilder<R>
  }
}

/** @riviere-role value-object */
export interface LocationConfiguration<R extends string> {
  readonly extend: (...locations: readonly LocationBuilder<R>[]) => LocationConfiguration<R>
  readonly locations: readonly LocationBuilder<R>[]
}

/** @riviere-role value-object */
export interface AssignedLocationConfiguration<R extends string> {
  readonly locations: LocationConfiguration<R>
  readonly packages: readonly string[]
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
  return createLocationBuilder({
    allowAnySubLocations: resolvedOptions?.allowAnySubLocations === true,
    allowedRoles: roles,
    ...(resolvedOptions?.dependencyRules === undefined
      ? {}
      : { dependencyRules: resolvedOptions.dependencyRules }),
    path,
    rolesSpecified: hasRoles,
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
  return createLocationConfiguration(locations)
}

function createLocationBuilder<R extends string>(
  definition: FluentLocationDefinition<R>,
): LocationBuilder<R> {
  assertNoExplicitSubLocationsInsideUnrestrictedLocation(definition)
  return {
    ...definition,
    subLocation(
      pathOrLocation: string | LocationBuilder<R>,
      roles: readonly R[] = [],
      options?: FluentLocationOptions<R>,
    ) {
      const child =
        typeof pathOrLocation === 'string'
          ? createLocationBuilder({
            allowAnySubLocations: options?.allowAnySubLocations === true,
            allowedRoles: roles,
            ...(options?.dependencyRules === undefined
              ? {}
              : { dependencyRules: options.dependencyRules }),
            path: pathOrLocation,
            rolesSpecified: true,
            subLocations: [],
          })
          : pathOrLocation
      return createLocationBuilder({
        ...definition,
        subLocations: mergeFluentLocations(definition.subLocations, [child]),
      })
    },
  }
}

function createLocationConfiguration<R extends string>(
  locations: readonly LocationBuilder<R>[],
): LocationConfiguration<R> {
  return {
    extend: (...extensions) =>
      createLocationConfiguration(mergeFluentLocations(locations, extensions)),
    locations,
  }
}

function mergeFluentLocations<R extends string>(
  base: readonly LocationBuilder<R>[],
  extensions: readonly LocationBuilder<R>[],
): LocationBuilder<R>[] {
  const merged = [...base]
  for (const extension of extensions) {
    const existing = merged.find((candidate) => candidate.path === extension.path)
    if (existing === undefined) {
      merged.push(extension)
      continue
    }
    merged[merged.indexOf(existing)] = createLocationBuilder({
      allowAnySubLocations: existing.allowAnySubLocations || extension.allowAnySubLocations,
      allowedRoles: extension.rolesSpecified ? extension.allowedRoles : existing.allowedRoles,
      ...dependencyRulesFrom(existing, extension),
      path: existing.path,
      rolesSpecified: existing.rolesSpecified || extension.rolesSpecified,
      subLocations: mergeFluentLocations(existing.subLocations, extension.subLocations),
    })
  }
  return merged
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

function dependencyRulesFrom<R extends string>(
  existing: LocationBuilder<R>,
  extension: LocationBuilder<R>,
): Pick<FluentLocationDefinition<R>, 'dependencyRules'> {
  if (extension.dependencyRules !== undefined) {
    return { dependencyRules: extension.dependencyRules }
  }
  if (existing.dependencyRules !== undefined) {
    return { dependencyRules: existing.dependencyRules }
  }
  return {}
}
