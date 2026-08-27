import type { LocationBuilder } from './location-configuration'
import type { PackageConfigurationAssignments } from './package-configuration-assignments'
import {
  InvalidRoleFilteredImportError,
  RepeatedInheritedImportError,
} from './role-configuration-errors'

type AllowedImport = string | Readonly<Record<string, readonly string[]>>
type ImportScope = 'sibling' | 'root' | 'ownSubdomain' | 'anySubdomain'

interface ImportRules {
  readonly allow?: Partial<Record<ImportScope, readonly AllowedImport[]>>
  readonly inheritParentImportRules?: false
}

interface LocationHierarchyNode {
  readonly allowAnySubLocations: boolean
  readonly allowedRoles: readonly string[]
  readonly importRules?: ImportRules
  readonly id: string
  readonly name: string
  readonly packagePath: string
  readonly parentId?: string
  readonly pathTemplate: string
  readonly roleEnforcement: boolean
}

/** @riviere-role value-object */
export class LocationHierarchy {
  declare private readonly brand: 'LocationHierarchy'

  private constructor(readonly values: readonly LocationHierarchyNode[]) {}

  static parse<R extends string>(
    assignments: PackageConfigurationAssignments<R>,
  ): LocationHierarchy {
    return LocationHierarchy.parseFromNodes(
      assignments.values.flatMap(({ packagePattern, configuration }) =>
        buildLocationHierarchy(packagePattern, configuration.locations),
      ),
    )
  }

  static parseFromNodes(nodes: readonly LocationHierarchyNode[]): LocationHierarchy {
    validateNoRepeatedInheritedImports(nodes)
    return new LocationHierarchy(nodes)
  }
}

function buildLocationHierarchy<R extends string>(
  packagePattern: string,
  configuration: { readonly locations: readonly LocationBuilder<R>[] },
): LocationHierarchyNode[] {
  const sourceRoot = buildSourceRoot(packagePattern)
  return [
    sourceRoot,
    ...configuration.locations.flatMap((root) =>
      buildLocation(root, packagePattern, sourceRoot),
    ),
  ]
}

function buildLocation<R extends string>(
  root: LocationBuilder<R>,
  packagePath: string,
  sourceRoot: LocationHierarchyNode,
): LocationHierarchyNode[] {
  return buildLocationNode(
    root,
    packagePath,
    sourceRoot.pathTemplate,
    `/${normalizeLocationPath(root.path)}`,
    true,
  )
}

function buildSourceRoot(packagePath: string): LocationHierarchyNode {
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

function buildLocationNode<R extends string>(
  definition: LocationBuilder<R>,
  packagePath: string,
  parentPathTemplate: string,
  locationName: string,
  isConfigurationRoot = false,
): LocationHierarchyNode[] {
  const pathTemplate = `${parentPathTemplate}/${normalizeLocationPath(definition.path)}`
  const node: LocationHierarchyNode = {
    allowAnySubLocations: definition.allowAnySubLocations,
    allowedRoles: definition.allowedRoles,
    ...(definition.importRules === undefined ? {} : { importRules: definition.importRules }),
    id: `${packagePath}:${pathTemplate}`,
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
      return buildLocationNode(child, packagePath, pathTemplate, childName)
    }),
  ]
}

function normalizeLocationPath(locationPath: string): string {
  return locationPath.split('/').filter(Boolean).join('/')
}

function validateNoRepeatedInheritedImports(
  locationHierarchy: readonly LocationHierarchyNode[],
): void {
  const locationsById = new Map(locationHierarchy.map((location) => [location.id, location]))
  for (const location of locationHierarchy) {
    if (location.importRules?.allow !== undefined) {
      validateNamedImports(location.importRules.allow)
    }
    if (
      location.importRules?.allow !== undefined &&
      location.importRules.inheritParentImportRules !== false
    ) {
      validateAgainstAncestors(location, parentOf(location, locationsById), locationsById)
    }
  }
}

function validateNamedImports(allow: NonNullable<ImportRules['allow']>): void {
  for (const scope of ['sibling', 'root', 'ownSubdomain', 'anySubdomain'] as const) {
    for (const allowedImport of allow[scope] ?? []) importName(allowedImport)
  }
}

function validateAgainstAncestors(
  location: LocationHierarchyNode,
  ancestor: LocationHierarchyNode | undefined,
  locationsById: ReadonlyMap<string, LocationHierarchyNode>,
): void {
  if (ancestor === undefined) return
  rejectRepeatedImports(location, ancestor)
  if (ancestor.importRules?.inheritParentImportRules !== false) {
    validateAgainstAncestors(location, parentOf(ancestor, locationsById), locationsById)
  }
}

function parentOf(
  location: LocationHierarchyNode,
  locationsById: ReadonlyMap<string, LocationHierarchyNode>,
): LocationHierarchyNode | undefined {
  return location.parentId === undefined ? undefined : locationsById.get(location.parentId)
}

function rejectRepeatedImports(
  location: LocationHierarchyNode,
  ancestor: LocationHierarchyNode,
): void {
  const ownAllow = location.importRules?.allow
  const inheritedAllow = ancestor.importRules?.allow
  if (ownAllow === undefined || inheritedAllow === undefined) return
  for (const scope of ['sibling', 'root', 'ownSubdomain', 'anySubdomain'] as const) {
    for (const ownImport of ownAllow[scope] ?? []) {
      if ((inheritedAllow[scope] ?? []).some((candidate) => sameImport(candidate, ownImport))) {
        throw new RepeatedInheritedImportError(location.name, scope, importName(ownImport))
      }
    }
  }
}

function sameImport(left: AllowedImport, right: AllowedImport): boolean {
  if (typeof left === 'string') return left === importName(right)
  if (typeof right === 'string') return false
  const leftEntry = roleEntry(left)
  const rightEntry = roleEntry(right)
  return (
    leftEntry[0] === rightEntry[0] &&
    leftEntry[1].length === rightEntry[1].length &&
    leftEntry[1].every((role) => rightEntry[1].includes(role))
  )
}

function importName(value: AllowedImport): string {
  return typeof value === 'string' ? value : roleEntry(value)[0]
}

function roleEntry(
  value: Readonly<Record<string, readonly string[]>>,
): [string, readonly string[]] {
  const entry = Object.entries(value)[0]
  if (entry === undefined) throw new InvalidRoleFilteredImportError()
  return entry
}
