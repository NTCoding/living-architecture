import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import {
  ArchitectureReviewSourceError,
  type ArchitectureItem,
  type ArchitecturePackageKind,
} from './architecture-review-types'

export interface ParsedSource {
  readonly sourceFile: ts.SourceFile
}

export interface AnnotatedDeclaration {
  readonly declaration: ts.Declaration
  readonly name: string
  readonly packageKind: ArchitecturePackageKind
  readonly role: string
  readonly sourceFile: ts.SourceFile
}

export function readProductionSources(sourceRoot: string): readonly ParsedSource[] {
  if (!existsSync(sourceRoot)) return []
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

export function annotatedDeclarations(
  sourceFile: ts.SourceFile,
  packageKind: ArchitecturePackageKind,
): readonly AnnotatedDeclaration[] {
  return sourceFile.statements.flatMap((statement): readonly AnnotatedDeclaration[] => {
    if (ts.isVariableStatement(statement)) {
      return annotatedVariables(statement, sourceFile, packageKind)
    }
    if (!isNamedArchitectureDeclaration(statement)) return []
    const role = roleAnnotation(statement)
    if (role === undefined || !isExported(statement)) return []
    return [{ declaration: statement, name: statement.name.text, packageKind, role, sourceFile }]
  })
}

export function aggregateOwnsEntity(
  aggregate: AnnotatedDeclaration,
  entity: AnnotatedDeclaration,
): boolean {
  if (!ts.isClassDeclaration(aggregate.declaration)) return false
  const imports = importedDeclarations(aggregate.sourceFile)
  return aggregate.declaration.members.some((member) => {
    if (ts.isPropertyDeclaration(member)) {
      return typeReferencesDeclaration(member.type, aggregate.sourceFile, entity, imports)
    }
    if (!ts.isConstructorDeclaration(member)) return false
    return member.parameters.some(
      (parameter) =>
        hasParameterPropertyModifier(parameter) &&
        typeReferencesDeclaration(parameter.type, aggregate.sourceFile, entity, imports),
    )
  })
}

export function publicMethodNames(declaration: AnnotatedDeclaration): readonly string[] {
  if (!ts.isClassDeclaration(declaration.declaration)) return []
  return uniqueText(
    declaration.declaration.members
      .filter(ts.isMethodDeclaration)
      .filter((method) => !ts.isPrivateIdentifier(method.name))
      .filter((method) => !hasModifier(method, ts.SyntaxKind.PrivateKeyword))
      .filter((method) => !hasModifier(method, ts.SyntaxKind.ProtectedKeyword))
      .map((method) => method.name.getText(declaration.sourceFile)),
  )
}

export function importedPackageNames(
  sources: readonly ParsedSource[],
  packageNames: ReadonlySet<string>,
): ReadonlySet<string> {
  const imports = new Set<string>()
  for (const { sourceFile } of sources) {
    for (const statement of sourceFile.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
        continue
      }
      const importedPath = statement.moduleSpecifier.text
      const packageName = [...packageNames].find(
        (candidate) => importedPath === candidate || importedPath.startsWith(`${candidate}/`),
      )
      if (packageName !== undefined) imports.add(packageName)
    }
  }
  return imports
}

export function packageManifestName(manifestPath: string): string {
  const manifest: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (!isRecord(manifest) || typeof manifest.name !== 'string' || manifest.name.length === 0) {
    throw new ArchitectureReviewSourceError(
      `Package manifest '${manifestPath}' must define a non-empty name.`,
    )
  }
  return manifest.name
}

export function toArchitectureItem(declaration: AnnotatedDeclaration): ArchitectureItem {
  return {
    name: declaration.name,
    packageKind: declaration.packageKind,
    role: declaration.role,
  }
}

export function uniqueItems(items: readonly ArchitectureItem[]): readonly ArchitectureItem[] {
  const unique = new Map(items.map((item) => [itemKey(item), item]))
  return [...unique.values()].sort(compareItems)
}

export function itemKey(item: ArchitectureItem): string {
  return `${item.packageKind}:${item.role}:${item.name}`
}

export function compareText(left: string, right: string): number {
  return left.localeCompare(right, 'en')
}

function annotatedVariables(
  statement: ts.VariableStatement,
  sourceFile: ts.SourceFile,
  packageKind: ArchitecturePackageKind,
): readonly AnnotatedDeclaration[] {
  const role = roleAnnotation(statement)
  if (role === undefined || !isExported(statement)) return []
  return statement.declarationList.declarations.flatMap(
    (declaration): readonly AnnotatedDeclaration[] =>
      ts.isIdentifier(declaration.name)
        ? [{ declaration, name: declaration.name.text, packageKind, role, sourceFile }]
        : [],
  )
}

function isNamedArchitectureDeclaration(
  statement: ts.Statement,
): statement is
  | ts.ClassDeclaration
  | ts.FunctionDeclaration
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration
  | ts.EnumDeclaration {
  return (
    (ts.isClassDeclaration(statement) ||
      ts.isFunctionDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isEnumDeclaration(statement)) &&
    statement.name !== undefined
  )
}

function roleAnnotation(node: ts.Node): string | undefined {
  const tag = ts.getJSDocTags(node).find((candidate) => candidate.tagName.text === 'riviere-role')
  return typeof tag?.comment === 'string' ? tag.comment.trim() : undefined
}

interface ImportedDeclaration {
  readonly importedName: string
  readonly moduleSpecifier: string
}

function typeReferencesDeclaration(
  typeNode: ts.TypeNode | undefined,
  sourceFile: ts.SourceFile,
  expectedDeclaration: AnnotatedDeclaration,
  imports: ReadonlyMap<string, ImportedDeclaration>,
): boolean {
  if (typeNode === undefined) return false
  return nodeReferencesDeclaration(typeNode, sourceFile, expectedDeclaration, imports)
}

function nodeReferencesDeclaration(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  expectedDeclaration: AnnotatedDeclaration,
  imports: ReadonlyMap<string, ImportedDeclaration>,
): boolean {
  if (ts.isIdentifier(node)) {
    const imported = imports.get(node.text)
    if (imported !== undefined) {
      return (
        imported.importedName === declarationExportName(expectedDeclaration) &&
        moduleReferencesSource(sourceFile.fileName, imported.moduleSpecifier, expectedDeclaration)
      )
    }
    if (
      node.text === expectedDeclaration.name &&
      sourceFile.fileName === expectedDeclaration.sourceFile.fileName
    ) {
      return true
    }
  }
  return (
    node.forEachChild(
      (child) =>
        nodeReferencesDeclaration(child, sourceFile, expectedDeclaration, imports) || undefined,
    ) ?? false
  )
}

function importedDeclarations(sourceFile: ts.SourceFile): ReadonlyMap<string, ImportedDeclaration> {
  const imports = new Map<string, ImportedDeclaration>()
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue
    }
    const importClause = statement.importClause
    if (importClause === undefined) continue
    if (importClause.name !== undefined) {
      imports.set(importClause.name.text, {
        importedName: 'default',
        moduleSpecifier: statement.moduleSpecifier.text,
      })
    }
    const bindings = importClause.namedBindings
    if (bindings === undefined || !ts.isNamedImports(bindings)) continue
    for (const element of bindings.elements) {
      imports.set(element.name.text, {
        importedName: element.propertyName?.text ?? element.name.text,
        moduleSpecifier: statement.moduleSpecifier.text,
      })
    }
  }
  return imports
}

function declarationExportName(declaration: AnnotatedDeclaration): string {
  return hasModifier(declaration.declaration, ts.SyntaxKind.DefaultKeyword)
    ? 'default'
    : declaration.name
}

function moduleReferencesSource(
  importingSourcePath: string,
  moduleSpecifier: string,
  expectedDeclaration: AnnotatedDeclaration,
): boolean {
  if (!moduleSpecifier.startsWith('.')) return false
  const modulePath = path.resolve(path.dirname(importingSourcePath), moduleSpecifier)
  const expectedSourcePath = path.resolve(expectedDeclaration.sourceFile.fileName)
  return moduleSourceCandidates(modulePath).includes(expectedSourcePath)
}

function moduleSourceCandidates(modulePath: string): readonly string[] {
  const extension = path.extname(modulePath)
  const extensionlessPath = ['.js', '.jsx', '.mjs', '.cjs'].includes(extension)
    ? modulePath.slice(0, -extension.length)
    : modulePath
  return [
    modulePath,
    `${extensionlessPath}.ts`,
    `${extensionlessPath}.tsx`,
    `${extensionlessPath}.mts`,
    `${extensionlessPath}.cts`,
    path.join(extensionlessPath, 'index.ts'),
    path.join(extensionlessPath, 'index.tsx'),
  ]
}

function productionSourcePaths(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => compareText(left.name, right.name))
    .flatMap((entry): readonly string[] => {
      if (entry.isDirectory()) {
        return isFixtureDirectory(entry.name)
          ? []
          : productionSourcePaths(path.join(directory, entry.name))
      }
      return entry.isFile() && isProductionTypeScriptFile(entry.name)
        ? [path.join(directory, entry.name)]
        : []
    })
}

function uniqueText(items: readonly string[]): readonly string[] {
  return [...new Set(items)].sort(compareText)
}

function compareItems(left: ArchitectureItem, right: ArchitectureItem): number {
  return compareText(left.name, right.name) || compareText(itemKey(left), itemKey(right))
}

function hasParameterPropertyModifier(parameter: ts.ParameterDeclaration): boolean {
  return (
    hasModifier(parameter, ts.SyntaxKind.PrivateKeyword) ||
    hasModifier(parameter, ts.SyntaxKind.ProtectedKeyword) ||
    hasModifier(parameter, ts.SyntaxKind.PublicKeyword) ||
    hasModifier(parameter, ts.SyntaxKind.ReadonlyKeyword)
  )
}

function hasModifier(node: ts.Node, modifier: ts.SyntaxKind): boolean {
  return ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((item) => item.kind === modifier)
}

function isExported(node: ts.Node): boolean {
  return hasModifier(node, ts.SyntaxKind.ExportKeyword)
}

function isProductionTypeScriptFile(fileName: string): boolean {
  const isTypeScript = fileName.endsWith('.ts') || fileName.endsWith('.tsx')
  const isTest = /\.(spec|test)\.[cm]?[jt]sx?$/.test(fileName)
  const isFixture = /(?:^|[.-])fixtures?\.[cm]?[jt]sx?$/.test(fileName)
  return isTypeScript && !fileName.endsWith('.d.ts') && !isTest && !isFixture
}

export function isFixtureDirectory(directoryName: string): boolean {
  return directoryName === '__fixtures__' || directoryName === 'fixtures'
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
