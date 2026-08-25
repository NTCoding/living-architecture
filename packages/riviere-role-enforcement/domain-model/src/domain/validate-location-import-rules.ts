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

interface LocationImportNode {
  readonly id: string
  readonly importRules?: ImportRules | undefined
  readonly name: string
  readonly parentId?: string | undefined
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function validateNoRepeatedInheritedImports(
  locationHierarchy: readonly LocationImportNode[],
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
  location: LocationImportNode,
  ancestor: LocationImportNode | undefined,
  locationsById: ReadonlyMap<string, LocationImportNode>,
): void {
  if (ancestor === undefined) return
  rejectRepeatedImports(location, ancestor)
  if (ancestor.importRules?.inheritParentImportRules !== false) {
    validateAgainstAncestors(location, parentOf(ancestor, locationsById), locationsById)
  }
}

function parentOf(
  location: LocationImportNode,
  locationsById: ReadonlyMap<string, LocationImportNode>,
): LocationImportNode | undefined {
  return location.parentId === undefined ? undefined : locationsById.get(location.parentId)
}

function rejectRepeatedImports(location: LocationImportNode, ancestor: LocationImportNode): void {
  const ownAllow = location.importRules?.allow
  const inheritedAllow = ancestor.importRules?.allow
  if (ownAllow === undefined || inheritedAllow === undefined) return
  for (const scope of ['sibling', 'root', 'ownSubdomain', 'anySubdomain'] as const) {
    for (const ownImport of ownAllow[scope] ?? []) {
      const ownImportName = importName(ownImport)
      if ((inheritedAllow[scope] ?? []).some((candidate) => sameImport(candidate, ownImport))) {
        throw new RepeatedInheritedImportError(location.name, scope, ownImportName)
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
  if (typeof value === 'string') return value
  return roleEntry(value)[0]
}

function roleEntry(
  value: Readonly<Record<string, readonly string[]>>,
): [string, readonly string[]] {
  const entry = Object.entries(value)[0]
  if (entry === undefined) throw new InvalidRoleFilteredImportError()
  return entry
}
