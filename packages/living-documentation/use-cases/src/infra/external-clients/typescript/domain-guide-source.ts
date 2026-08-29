import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { aggregateRepositoryReturns, inspectInvocations } from './use-case-invocations'
import { annotatedDeclarations } from './typescript-invocation-support'

/** @riviere-role external-client-model */
export type DomainConceptRole = 'aggregate' | 'domain-service'
type UseCaseRole = 'command-use-case' | 'query-model-use-case'

/** @riviere-role external-client-model */
export interface ParsedSource {
  readonly sourceFile: ts.SourceFile
}

/** @riviere-role external-client-model */
export interface AnnotatedDeclaration {
  readonly declaration: ts.ClassDeclaration | ts.FunctionDeclaration
  readonly name: string
  readonly role: string
  readonly sourceFile: ts.SourceFile
}

/** @riviere-role external-client-model */
export interface DomainConcept {
  readonly name: string
  readonly role: DomainConceptRole
}

/** @riviere-role external-client-model */
export interface AggregateGuideEntry {
  readonly name: string
  readonly operations: readonly string[]
}

/** @riviere-role external-client-model */
export interface InvocationGuideEntry {
  readonly concept: string
  readonly operation: string
  readonly role: DomainConceptRole
}

/** @riviere-role external-client-model */
export interface UseCaseGuideEntry {
  readonly availableInCli: boolean
  readonly invocations: readonly InvocationGuideEntry[]
  readonly name: string
  readonly role: UseCaseRole
}

/** @riviere-role external-client-model */
export interface SubdomainGuideEntry {
  readonly aggregates: readonly AggregateGuideEntry[]
  readonly description: string
  readonly domainModelPackageName?: string
  readonly name: string
  readonly publishedLanguagePackageName?: string
  readonly useCases: readonly UseCaseGuideEntry[]
}

interface PackageManifest {
  readonly description?: unknown
  readonly name?: unknown
}

class DomainGuideSourceError extends Error {
  override readonly name = 'DomainGuideSourceError'
}

/** @riviere-role external-client-service */
export function inspectTypescriptSubdomains(workspaceRoot: string): readonly SubdomainGuideEntry[] {
  const packagesRoot = path.join(workspaceRoot, 'packages')
  const cliSources = [path.join(workspaceRoot, 'apps'), path.join(workspaceRoot, 'tools')].flatMap(
    readProductionSources,
  )
  return readdirSync(packagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((subdomain) => hasDomainPackage(packagesRoot, subdomain))
    .sort(compareText)
    .map((subdomain) => inspectSubdomain(workspaceRoot, subdomain, cliSources))
}

function inspectSubdomain(
  workspaceRoot: string,
  subdomain: string,
  cliSources: readonly ParsedSource[],
): SubdomainGuideEntry {
  const subdomainRoot = path.join(workspaceRoot, 'packages', subdomain)
  const domainModelRoot = path.join(subdomainRoot, 'domain-model')
  const publishedLanguageRoot = path.join(subdomainRoot, 'published-language')
  const domainModelManifest = readOptionalPackageManifest(domainModelRoot)
  const publishedLanguageManifest = readOptionalPackageManifest(publishedLanguageRoot)
  const descriptionRoot =
    domainModelManifest === undefined ? publishedLanguageRoot : domainModelRoot
  const descriptionManifest =
    domainModelManifest ?? readPackageManifest(path.join(publishedLanguageRoot, 'package.json'))
  const description = requiredManifestString(descriptionManifest, 'description', descriptionRoot)
  const domainModelPackageName = optionalManifestName(domainModelManifest, domainModelRoot)
  const publishedLanguagePackageName = optionalManifestName(
    publishedLanguageManifest,
    publishedLanguageRoot,
  )
  const domainSources = readProductionSources(path.join(domainModelRoot, 'src'))
  const domainDeclarations = annotatedDeclarations(domainSources)
  const domainConcepts = domainConceptMap(domainDeclarations)
  const aggregates = aggregateEntries(domainDeclarations)
  const useCases = inspectUseCases(
    path.join(subdomainRoot, 'use-cases'),
    domainModelPackageName,
    domainConcepts,
    cliSources,
  )
  return {
    aggregates,
    description,
    ...(domainModelPackageName === undefined ? {} : { domainModelPackageName }),
    name: subdomain,
    ...(publishedLanguagePackageName === undefined ? {} : { publishedLanguagePackageName }),
    useCases,
  }
}

function inspectUseCases(
  useCasesRoot: string,
  domainModelPackageName: string | undefined,
  domainConcepts: ReadonlyMap<string, DomainConcept>,
  cliSources: readonly ParsedSource[],
): readonly UseCaseGuideEntry[] {
  if (!existsSync(path.join(useCasesRoot, 'package.json'))) {
    return []
  }
  const useCasesPackageName = requiredManifestString(
    readPackageManifest(path.join(useCasesRoot, 'package.json')),
    'name',
    useCasesRoot,
  )
  const useCaseSources = readProductionSources(path.join(useCasesRoot, 'src'))
  const declarations = annotatedDeclarations(useCaseSources).filter(
    (entry): entry is AnnotatedDeclaration & { role: UseCaseRole } => isUseCaseRole(entry.role),
  )
  const repositoryReturns =
    domainModelPackageName === undefined
      ? new Map()
      : aggregateRepositoryReturns(useCaseSources, domainModelPackageName, domainConcepts)
  const cliUseCases = importedUseCases(
    cliSources,
    useCasesPackageName,
    new Set(declarations.map((entry) => entry.name)),
  )
  return declarations
    .map((entry) => ({
      availableInCli: cliUseCases.has(entry.name),
      invocations: inspectInvocations(
        entry,
        domainModelPackageName,
        domainConcepts,
        repositoryReturns,
      ),
      name: entry.name,
      role: entry.role,
    }))
    .sort((left, right) => compareText(left.name, right.name))
}

function hasDomainPackage(packagesRoot: string, subdomain: string): boolean {
  return ['domain-model', 'published-language'].some((packageKind) =>
    existsSync(path.join(packagesRoot, subdomain, packageKind, 'package.json')),
  )
}

function readOptionalPackageManifest(packageRoot: string): PackageManifest | undefined {
  const manifestPath = path.join(packageRoot, 'package.json')
  return existsSync(manifestPath) ? readPackageManifest(manifestPath) : undefined
}

function optionalManifestName(
  manifest: PackageManifest | undefined,
  packageRoot: string,
): string | undefined {
  return manifest === undefined ? undefined : requiredManifestString(manifest, 'name', packageRoot)
}

function aggregateEntries(
  declarations: readonly AnnotatedDeclaration[],
): readonly AggregateGuideEntry[] {
  return declarations
    .filter(
      (entry): entry is AnnotatedDeclaration & { declaration: ts.ClassDeclaration } =>
        entry.role === 'aggregate' && ts.isClassDeclaration(entry.declaration),
    )
    .map((entry) => ({
      name: entry.name,
      operations: publicMethodNames(entry.declaration, entry.sourceFile),
    }))
    .sort((left, right) => compareText(left.name, right.name))
}

function publicMethodNames(
  declaration: ts.ClassDeclaration,
  sourceFile: ts.SourceFile,
): readonly string[] {
  const operations = declaration.members
    .filter(ts.isMethodDeclaration)
    .filter((method) => !hasModifier(method, ts.SyntaxKind.PrivateKeyword))
    .filter((method) => !hasModifier(method, ts.SyntaxKind.ProtectedKeyword))
    .map((method) => method.name.getText(sourceFile))
  return [...new Set(operations)]
}

function domainConceptMap(
  declarations: readonly AnnotatedDeclaration[],
): ReadonlyMap<string, DomainConcept> {
  const concepts = new Map<string, DomainConcept>()
  for (const entry of declarations) {
    if (!isDomainConceptRole(entry.role)) {
      continue
    }
    const existing = concepts.get(entry.name)
    if (existing === undefined || entry.role === 'aggregate') {
      concepts.set(entry.name, { name: entry.name, role: entry.role })
    }
  }
  return concepts
}

function importedUseCases(
  sources: readonly ParsedSource[],
  useCasesPackageName: string,
  useCaseNames: ReadonlySet<string>,
): ReadonlySet<string> {
  const importedNames = sources.flatMap(({ sourceFile }) =>
    sourceFile.statements.flatMap((statement) =>
      importedNamesFromPackage(statement, useCasesPackageName),
    ),
  )
  return new Set(importedNames.filter((name) => useCaseNames.has(name)))
}

function importedNamesFromPackage(statement: ts.Statement, packageName: string): readonly string[] {
  if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
    return []
  }
  if (!isPackageImport(statement.moduleSpecifier.text, packageName)) {
    return []
  }
  const bindings = statement.importClause?.namedBindings
  if (bindings === undefined || !ts.isNamedImports(bindings)) {
    return []
  }
  return bindings.elements.map((element) => element.propertyName?.text ?? element.name.text)
}

function readProductionSources(sourceRoot: string): readonly ParsedSource[] {
  if (!existsSync(sourceRoot)) {
    return []
  }
  return productionSourcePaths(sourceRoot).map((sourcePath) => ({
    sourceFile: ts.createSourceFile(
      sourcePath,
      readFileSync(sourcePath, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      sourcePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    ),
  }))
}

function productionSourcePaths(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => compareText(left.name, right.name))
    .flatMap((entry) => {
      if (entry.isDirectory()) {
        return isFixtureDirectory(entry.name)
          ? []
          : productionSourcePaths(path.join(directory, entry.name))
      }
      return isProductionTypeScriptFile(entry.name) ? [path.join(directory, entry.name)] : []
    })
}

function isProductionTypeScriptFile(fileName: string): boolean {
  const isTypeScript = fileName.endsWith('.ts') || fileName.endsWith('.tsx')
  const isTest = /\.(spec|test)\.[cm]?[jt]sx?$/.test(fileName)
  const isFixture = /(?:^|[.-])fixtures?\.[cm]?[jt]sx?$/.test(fileName)
  return isTypeScript && !fileName.endsWith('.d.ts') && !isTest && !isFixture
}

function isFixtureDirectory(directoryName: string): boolean {
  return directoryName === '__fixtures__' || directoryName === 'fixtures'
}

function readPackageManifest(manifestPath: string): PackageManifest {
  const parsed: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (!isRecord(parsed)) {
    throw new DomainGuideSourceError(
      `Package manifest '${manifestPath}' must contain a JSON object.`,
    )
  }
  return parsed
}

function requiredManifestString(
  manifest: PackageManifest,
  property: keyof PackageManifest,
  packageRoot: string,
): string {
  const value = manifest[property]
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new DomainGuideSourceError(
      `Package '${path.relative(process.cwd(), packageRoot)}' must define a non-empty string '${property}' in package.json.`,
    )
  }
  return value
}

function isPackageImport(moduleSpecifier: string, packageName: string): boolean {
  return moduleSpecifier === packageName || moduleSpecifier.startsWith(`${packageName}/`)
}

function isDomainConceptRole(role: string): role is DomainConceptRole {
  return role === 'aggregate' || role === 'domain-service'
}

function isUseCaseRole(role: string): role is UseCaseRole {
  return role === 'command-use-case' || role === 'query-model-use-case'
}

function hasModifier(node: ts.Node, modifier: ts.SyntaxKind): boolean {
  return (
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node)?.some((item) => item.kind === modifier) ?? false)
  )
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, 'en')
}
