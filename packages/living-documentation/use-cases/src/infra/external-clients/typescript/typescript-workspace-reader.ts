import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import {
  TypescriptWorkspaceReadError,
  type TypescriptArchitectureItem,
  type TypescriptArchitectureLayerSnapshot,
  type TypescriptArchitecturePackageKind,
  type TypescriptArchitectureSnapshot,
  type TypescriptSubdomainArchitectureSnapshot,
} from './typescript-architecture-model'
import {
  compareTypescriptText,
  findTypescriptAnnotatedDeclarations,
  isTypescriptFixtureDirectory,
  readTypescriptImportedPackageNames,
  readTypescriptPackageManifestName,
  readTypescriptProductionSources,
  readTypescriptPublicMethodNames,
  toTypescriptArchitectureItem,
  typescriptAggregateOwnsEntity,
  uniqueTypescriptArchitectureItems,
  type TypescriptAnnotatedDeclaration,
  type TypescriptParsedSource,
} from './typescript-source-reader'

interface MutableSubdomainSnapshot {
  readonly domainDeclarations: TypescriptAnnotatedDeclaration[]
  readonly entrypoints: TypescriptArchitectureItem[]
  readonly name: string
  readonly useCases: TypescriptArchitectureItem[]
}

/** @riviere-role external-client-service */
export class TypescriptWorkspaceReader {
  readArchitectureSnapshot(workspaceRoot: string): TypescriptArchitectureSnapshot {
    return readTypescriptArchitecture(workspaceRoot)
  }
}

function readTypescriptArchitecture(workspaceRoot: string): TypescriptArchitectureSnapshot {
  const subdomains = readPackageSubdomains(workspaceRoot)
  readEntrypoints(workspaceRoot, subdomains)
  return {
    subdomains: [...subdomains.values()]
      .map(toSubdomainSnapshot)
      .sort((left, right) => compareTypescriptText(left.name, right.name)),
  }
}

function readPackageSubdomains(workspaceRoot: string): Map<string, MutableSubdomainSnapshot> {
  const packagesRoot = path.join(workspaceRoot, 'packages')
  const subdomains = new Map<string, MutableSubdomainSnapshot>()
  if (!existsSync(packagesRoot)) return subdomains
  for (const entry of readdirSync(packagesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || isTypescriptFixtureDirectory(entry.name)) continue
    const subdomainRoot = path.join(packagesRoot, entry.name)
    const snapshot: MutableSubdomainSnapshot = {
      domainDeclarations: [],
      entrypoints: [],
      name: entry.name,
      useCases: [],
    }
    readPackage(subdomainRoot, 'domain-model', snapshot.domainDeclarations)
    readPackage(subdomainRoot, 'published-language', snapshot.domainDeclarations)
    const useCaseDeclarations: TypescriptAnnotatedDeclaration[] = []
    readPackage(subdomainRoot, 'use-cases', useCaseDeclarations)
    snapshot.useCases.push(...useCaseDeclarations.map(toTypescriptArchitectureItem))
    if (snapshot.domainDeclarations.length > 0 || snapshot.useCases.length > 0) {
      subdomains.set(entry.name, snapshot)
    }
  }
  return subdomains
}

function readPackage(
  subdomainRoot: string,
  packageKind: Exclude<TypescriptArchitecturePackageKind, 'application'>,
  target: TypescriptAnnotatedDeclaration[],
): void {
  const packageRoot = path.join(subdomainRoot, packageKind)
  if (!existsSync(path.join(packageRoot, 'package.json'))) return
  target.push(
    ...readTypescriptProductionSources(path.join(packageRoot, 'src')).flatMap(
      ({ sourceFile }): readonly TypescriptAnnotatedDeclaration[] =>
        findTypescriptAnnotatedDeclarations(sourceFile, packageKind),
    ),
  )
}

function readEntrypoints(
  workspaceRoot: string,
  subdomains: Map<string, MutableSubdomainSnapshot>,
): void {
  const useCasePackages = useCasePackageMap(workspaceRoot, subdomains)
  for (const entrypointRoot of entrypointRoots(workspaceRoot)) {
    readEntrypointRoot(entrypointRoot, useCasePackages, subdomains)
  }
}

function readEntrypointRoot(
  entrypointRoot: string,
  useCasePackages: ReadonlyMap<string, string>,
  subdomains: Map<string, MutableSubdomainSnapshot>,
): void {
  const sources = readTypescriptProductionSources(entrypointRoot)
  const declarations = sources.flatMap(
    ({ sourceFile }): readonly TypescriptAnnotatedDeclaration[] =>
      findTypescriptAnnotatedDeclarations(sourceFile, 'application'),
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
      throw new TypescriptWorkspaceReadError(
        `Cannot determine one subdomain for entrypoint declaration '${declaration.name}'.`,
      )
    }
    subdomains.get(owner)?.entrypoints.push(toTypescriptArchitectureItem(declaration))
  }
}

function toSubdomainSnapshot(
  snapshot: MutableSubdomainSnapshot,
): TypescriptSubdomainArchitectureSnapshot {
  const { aggregates, items } = readDomain(snapshot.domainDeclarations)
  return {
    layers: {
      domain: { aggregates, items },
      entrypoints: {
        aggregates: [],
        items: uniqueTypescriptArchitectureItems(snapshot.entrypoints),
      },
      'use-cases': {
        aggregates: [],
        items: uniqueTypescriptArchitectureItems(snapshot.useCases),
      },
    },
    name: snapshot.name,
  }
}

function readDomain(
  declarations: readonly TypescriptAnnotatedDeclaration[],
): TypescriptArchitectureLayerSnapshot {
  const aggregateDeclarations = declarations.filter((entry) => entry.role === 'aggregate')
  const aggregateEntities = declarations.filter((entry) => entry.role === 'aggregate-entity')
  const entitiesByAggregate = aggregateEntityOwners(aggregateDeclarations, aggregateEntities)
  const ownedEntities = new Set(
    [...entitiesByAggregate.values()].flatMap((entities) => entities.map(annotatedDeclarationKey)),
  )
  const aggregates = aggregateDeclarations.map((entry) => ({
    entities: (entitiesByAggregate.get(annotatedDeclarationKey(entry)) ?? []).map(
      toTypescriptArchitectureItem,
    ),
    methods: readTypescriptPublicMethodNames(entry),
    name: entry.name,
    packageKind: entry.packageKind,
  }))
  const items = declarations
    .filter((entry) => entry.role !== 'aggregate')
    .filter((entry) => !ownedEntities.has(annotatedDeclarationKey(entry)))
    .map(toTypescriptArchitectureItem)
  return {
    aggregates: aggregates.toSorted((left, right) => compareTypescriptText(left.name, right.name)),
    items: uniqueTypescriptArchitectureItems(items),
  }
}

function aggregateEntityOwners(
  aggregates: readonly TypescriptAnnotatedDeclaration[],
  entities: readonly TypescriptAnnotatedDeclaration[],
): ReadonlyMap<string, readonly TypescriptAnnotatedDeclaration[]> {
  const owners = new Map<string, TypescriptAnnotatedDeclaration[]>()
  for (const entity of entities) {
    const matchingAggregates = aggregates.filter(
      (aggregate) =>
        aggregate.packageKind === entity.packageKind &&
        typescriptAggregateOwnsEntity(aggregate, entity),
    )
    if (matchingAggregates.length > 1) {
      throw new TypescriptWorkspaceReadError(
        `Aggregate entity '${entity.name}' is referenced as state by more than one aggregate.`,
      )
    }
    const owner = matchingAggregates[0]
    if (owner === undefined) continue
    const ownerKey = annotatedDeclarationKey(owner)
    const owned = owners.get(ownerKey) ?? []
    owned.push(entity)
    owners.set(ownerKey, owned)
  }
  return owners
}

function annotatedDeclarationKey(declaration: TypescriptAnnotatedDeclaration): string {
  return `${declaration.packageKind}:${declaration.role}:${declaration.name}:${declaration.sourceFile.fileName}`
}

function useCasePackageMap(
  workspaceRoot: string,
  subdomains: ReadonlyMap<string, MutableSubdomainSnapshot>,
): ReadonlyMap<string, string> {
  const packages = new Map<string, string>()
  for (const subdomain of subdomains.keys()) {
    const manifestPath = path.join(workspaceRoot, 'packages', subdomain, 'use-cases/package.json')
    if (!existsSync(manifestPath)) continue
    packages.set(readTypescriptPackageManifestName(manifestPath), subdomain)
  }
  return packages
}

function importedSubdomains(
  sources: readonly TypescriptParsedSource[],
  useCasePackages: ReadonlyMap<string, string>,
): ReadonlySet<string> {
  const importedPackages = readTypescriptImportedPackageNames(
    sources,
    new Set(useCasePackages.keys()),
  )
  return new Set(
    [...useCasePackages.entries()]
      .filter(([packageName]) => importedPackages.has(packageName))
      .map(([, subdomain]) => subdomain),
  )
}

function oneSubdomain(subdomains: ReadonlySet<string>): string | undefined {
  return subdomains.size === 1 ? [...subdomains][0] : undefined
}

function entrypointRoots(workspaceRoot: string): readonly string[] {
  return [path.join(workspaceRoot, 'apps'), path.join(workspaceRoot, 'tools')].flatMap(
    (applicationsRoot) =>
      existsSync(applicationsRoot) ? findNamedDirectories(applicationsRoot, 'entrypoint') : [],
  )
}

function findNamedDirectories(directory: string, name: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry): readonly string[] => {
    if (!entry.isDirectory() || isTypescriptFixtureDirectory(entry.name)) return []
    const child = path.join(directory, entry.name)
    return entry.name === name ? [child] : findNamedDirectories(child, name)
  })
}
