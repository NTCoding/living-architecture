import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import {
  ArchitectureReviewSourceError,
  type ArchitectureItem,
  type ArchitectureLayerSnapshot,
  type ArchitecturePackageKind,
  type ArchitectureSnapshot,
  type SubdomainArchitectureSnapshot,
} from './architecture-review-types'
import {
  aggregateOwnsEntity,
  annotatedDeclarations,
  compareText,
  importedPackageNames,
  isFixtureDirectory,
  itemKey,
  packageManifestName,
  publicMethodNames,
  readProductionSources,
  toArchitectureItem,
  uniqueItems,
  type AnnotatedDeclaration,
  type ParsedSource,
} from './typescript-architecture-source'

interface MutableSubdomainSnapshot {
  readonly domainDeclarations: AnnotatedDeclaration[]
  readonly entrypoints: ArchitectureItem[]
  readonly name: string
  readonly useCases: ArchitectureItem[]
}

export function inspectArchitecture(workspaceRoot: string): ArchitectureSnapshot {
  const subdomains = inspectPackageSubdomains(workspaceRoot)
  inspectEntrypoints(workspaceRoot, subdomains)
  return {
    subdomains: [...subdomains.values()]
      .map(toSubdomainSnapshot)
      .sort((left, right) => compareText(left.name, right.name)),
  }
}

function inspectPackageSubdomains(workspaceRoot: string): Map<string, MutableSubdomainSnapshot> {
  const packagesRoot = path.join(workspaceRoot, 'packages')
  const subdomains = new Map<string, MutableSubdomainSnapshot>()
  if (!existsSync(packagesRoot)) return subdomains
  for (const entry of readdirSync(packagesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const subdomainRoot = path.join(packagesRoot, entry.name)
    const snapshot: MutableSubdomainSnapshot = {
      domainDeclarations: [],
      entrypoints: [],
      name: entry.name,
      useCases: [],
    }
    inspectPackage(subdomainRoot, 'domain-model', snapshot.domainDeclarations)
    inspectPackage(subdomainRoot, 'published-language', snapshot.domainDeclarations)
    const useCaseDeclarations: AnnotatedDeclaration[] = []
    inspectPackage(subdomainRoot, 'use-cases', useCaseDeclarations)
    snapshot.useCases.push(...useCaseDeclarations.map(toArchitectureItem))
    if (snapshot.domainDeclarations.length > 0 || snapshot.useCases.length > 0) {
      subdomains.set(entry.name, snapshot)
    }
  }
  return subdomains
}

function inspectPackage(
  subdomainRoot: string,
  packageKind: Exclude<ArchitecturePackageKind, 'application'>,
  target: AnnotatedDeclaration[],
): void {
  const packageRoot = path.join(subdomainRoot, packageKind)
  if (!existsSync(path.join(packageRoot, 'package.json'))) return
  target.push(
    ...readProductionSources(path.join(packageRoot, 'src')).flatMap(
      ({ sourceFile }): readonly AnnotatedDeclaration[] =>
        annotatedDeclarations(sourceFile, packageKind),
    ),
  )
}

function inspectEntrypoints(
  workspaceRoot: string,
  subdomains: Map<string, MutableSubdomainSnapshot>,
): void {
  const useCasePackages = useCasePackageMap(workspaceRoot, subdomains)
  for (const entrypointRoot of entrypointRoots(path.join(workspaceRoot, 'apps'))) {
    inspectEntrypointRoot(entrypointRoot, useCasePackages, subdomains)
  }
}

function inspectEntrypointRoot(
  entrypointRoot: string,
  useCasePackages: ReadonlyMap<string, string>,
  subdomains: Map<string, MutableSubdomainSnapshot>,
): void {
  const sources = readProductionSources(entrypointRoot)
  const declarations = sources.flatMap(({ sourceFile }): readonly AnnotatedDeclaration[] =>
    annotatedDeclarations(sourceFile, 'application'),
  )
  if (declarations.length === 0) return
  const rootSubdomains = importedSubdomains(sources, useCasePackages)
  for (const declaration of declarations) {
    const sourceSubdomains = importedSubdomains(
      [{ sourceFile: declaration.sourceFile }],
      useCasePackages,
    )
    const owner = oneSubdomain(sourceSubdomains) ?? oneSubdomain(rootSubdomains)
    if (owner === undefined) {
      throw new ArchitectureReviewSourceError(
        `Cannot determine one subdomain for entrypoint declaration '${declaration.name}'.`,
      )
    }
    subdomains.get(owner)?.entrypoints.push(toArchitectureItem(declaration))
  }
}

function toSubdomainSnapshot(snapshot: MutableSubdomainSnapshot): SubdomainArchitectureSnapshot {
  const { aggregates, items } = inspectDomain(snapshot.domainDeclarations)
  return {
    layers: {
      domain: { aggregates, items },
      entrypoints: { aggregates: [], items: uniqueItems(snapshot.entrypoints) },
      'use-cases': { aggregates: [], items: uniqueItems(snapshot.useCases) },
    },
    name: snapshot.name,
  }
}

function inspectDomain(declarations: readonly AnnotatedDeclaration[]): ArchitectureLayerSnapshot {
  const aggregateDeclarations = declarations.filter((entry) => entry.role === 'aggregate')
  const aggregateEntities = declarations.filter((entry) => entry.role === 'aggregate-entity')
  const entitiesByAggregate = aggregateEntityOwners(aggregateDeclarations, aggregateEntities)
  const ownedEntities = new Set(
    [...entitiesByAggregate.values()].flatMap((entities) => entities.map(itemKey)),
  )
  const aggregates = aggregateDeclarations.map((entry) => ({
    entities: entitiesByAggregate.get(aggregateDeclarationKey(entry)) ?? [],
    methods: publicMethodNames(entry),
    name: entry.name,
    packageKind: entry.packageKind,
  }))
  const items = declarations
    .filter((entry) => entry.role !== 'aggregate')
    .map(toArchitectureItem)
    .filter((item) => !ownedEntities.has(itemKey(item)))
  return {
    aggregates: aggregates.toSorted((left, right) => compareText(left.name, right.name)),
    items: uniqueItems(items),
  }
}

function aggregateEntityOwners(
  aggregates: readonly AnnotatedDeclaration[],
  entities: readonly AnnotatedDeclaration[],
): ReadonlyMap<string, readonly ArchitectureItem[]> {
  const owners = new Map<string, ArchitectureItem[]>()
  for (const entity of entities) {
    const matchingAggregates = aggregates.filter(
      (aggregate) =>
        aggregate.packageKind === entity.packageKind && aggregateOwnsEntity(aggregate, entity),
    )
    if (matchingAggregates.length > 1) {
      throw new ArchitectureReviewSourceError(
        `Aggregate entity '${entity.name}' is referenced as state by more than one aggregate.`,
      )
    }
    const owner = matchingAggregates[0]
    if (owner === undefined) continue
    const ownerKey = aggregateDeclarationKey(owner)
    const owned = owners.get(ownerKey) ?? []
    owned.push(toArchitectureItem(entity))
    owners.set(ownerKey, owned)
  }
  return owners
}

function aggregateDeclarationKey(
  aggregate: Pick<AnnotatedDeclaration, 'name' | 'packageKind'>,
): string {
  return `${aggregate.packageKind}:${aggregate.name}`
}

function useCasePackageMap(
  workspaceRoot: string,
  subdomains: ReadonlyMap<string, MutableSubdomainSnapshot>,
): ReadonlyMap<string, string> {
  const packages = new Map<string, string>()
  for (const subdomain of subdomains.keys()) {
    const manifestPath = path.join(workspaceRoot, 'packages', subdomain, 'use-cases/package.json')
    if (!existsSync(manifestPath)) continue
    packages.set(packageManifestName(manifestPath), subdomain)
  }
  return packages
}

function importedSubdomains(
  sources: readonly ParsedSource[],
  useCasePackages: ReadonlyMap<string, string>,
): ReadonlySet<string> {
  return new Set(
    [...importedPackageNames(sources, new Set(useCasePackages.keys()))].flatMap(
      (packageName): readonly string[] => {
        const subdomain = useCasePackages.get(packageName)
        return subdomain === undefined ? [] : [subdomain]
      },
    ),
  )
}

function oneSubdomain(subdomains: ReadonlySet<string>): string | undefined {
  return subdomains.size === 1 ? [...subdomains][0] : undefined
}

function entrypointRoots(appsRoot: string): readonly string[] {
  return existsSync(appsRoot) ? findNamedDirectories(appsRoot, 'entrypoint') : []
}

function findNamedDirectories(directory: string, name: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry): readonly string[] => {
    if (!entry.isDirectory() || isFixtureDirectory(entry.name)) return []
    const child = path.join(directory, entry.name)
    return entry.name === name ? [child] : findNamedDirectories(child, name)
  })
}
