import { readFileSync } from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import {
  TypescriptWorkspaceReadError,
  type TypescriptArchitectureItem,
  type TypescriptArchitecturePackageKind,
  type TypescriptArchitectureRelationship,
} from './typescript-architecture-model'
import type { TypescriptParsedSource } from './typescript-production-source-reader'

const EXTERNAL_CLIENT_LOCATION = /[/\\]infra[/\\]external-clients[/\\]([^/\\]+)/

/** @riviere-role external-client-model */
export interface TypescriptAnnotatedDeclaration {
  readonly declaration: ts.Declaration
  readonly name: string
  readonly packageKind: TypescriptArchitecturePackageKind
  readonly role: string
  readonly sourceFile: ts.SourceFile
}

/** @riviere-role external-client-service */
export function findTypescriptAnnotatedDeclarations(
  sourceFile: ts.SourceFile,
  packageKind: TypescriptArchitecturePackageKind,
): readonly TypescriptAnnotatedDeclaration[] {
  return sourceFile.statements.flatMap((statement): readonly TypescriptAnnotatedDeclaration[] => {
    if (ts.isVariableStatement(statement)) {
      return annotatedVariables(statement, sourceFile, packageKind)
    }
    if (!isNamedArchitectureDeclaration(statement)) return []
    const role = roleAnnotation(statement)
    if (role === undefined || !isExported(statement)) return []
    const declarationName = statement.name.text
    return [{ declaration: statement, name: declarationName, packageKind, role, sourceFile }]
  })
}

/** @riviere-role external-client-service */
export function typescriptAggregateOwnsEntity(
  aggregate: TypescriptAnnotatedDeclaration,
  entity: TypescriptAnnotatedDeclaration,
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

/** @riviere-role external-client-service */
export function typescriptDeclarationReferencesDeclaration(
  source: TypescriptAnnotatedDeclaration,
  target: TypescriptAnnotatedDeclaration,
): boolean {
  return nodeReferencesDeclaration(
    source.declaration,
    source.sourceFile,
    target,
    importedDeclarations(source.sourceFile),
  )
}

/** @riviere-role external-client-service */
export function readTypescriptPublicMethodNames(
  declaration: TypescriptAnnotatedDeclaration,
): readonly string[] {
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

/** @riviere-role external-client-service */
export function readTypescriptImportedPackageNames(
  sources: readonly TypescriptParsedSource[],
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

/** @riviere-role external-client-service */
export function readTypescriptPackageManifestName(manifestPath: string): string {
  const manifest = parseTypescriptPackageManifest(manifestPath)
  if (
    !isRecord(manifest) ||
    typeof manifest['name'] !== 'string' ||
    manifest['name'].length === 0
  ) {
    throw new TypescriptWorkspaceReadError(
      `Package manifest '${manifestPath}' must define a non-empty name.`,
    )
  }
  return manifest['name']
}

function parseTypescriptPackageManifest(manifestPath: string): unknown {
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf8'))
  } catch {
    throw new TypescriptWorkspaceReadError(
      `Package manifest '${manifestPath}' must contain valid JSON.`,
    )
  }
}

/** @riviere-role external-client-service */
export function toTypescriptArchitectureItem(
  declaration: TypescriptAnnotatedDeclaration,
  relatedTo: readonly TypescriptArchitectureRelationship[] = [],
): TypescriptArchitectureItem {
  const externalClient = EXTERNAL_CLIENT_LOCATION.exec(declaration.sourceFile.fileName)?.[1]
  const relationships = uniqueRelationships(relatedTo)
  return {
    ...(externalClient === undefined ? {} : { externalClient }),
    name: declaration.name,
    packageKind: declaration.packageKind,
    ...(relationships.length === 0 ? {} : { relatedTo: relationships }),
    role: declaration.role,
  }
}

/** @riviere-role external-client-service */
export function uniqueTypescriptArchitectureItems(
  items: readonly TypescriptArchitectureItem[],
): readonly TypescriptArchitectureItem[] {
  const unique = new Map(items.map((item) => [typescriptArchitectureItemKey(item), item]))
  return [...unique.values()].sort(compareArchitectureItems)
}

/** @riviere-role external-client-service */
function typescriptArchitectureItemKey(item: TypescriptArchitectureItem): string {
  const externalClient = item.externalClient ?? 'no-external-client'
  const relationships = uniqueRelationships(item.relatedTo ?? [])
    .map((relationship) => `${relationship.role}:${relationship.name}`)
    .join(',')
  return `${item.packageKind}:${item.role}:${item.name}:${externalClient}:${relationships}`
}

/** @riviere-role external-client-service */
export function compareTypescriptText(left: string, right: string): number {
  return left.localeCompare(right, 'en')
}

function annotatedVariables(
  statement: ts.VariableStatement,
  sourceFile: ts.SourceFile,
  packageKind: TypescriptArchitecturePackageKind,
): readonly TypescriptAnnotatedDeclaration[] {
  const role = roleAnnotation(statement)
  if (role === undefined || !isExported(statement)) return []
  return statement.declarationList.declarations.flatMap(
    (declaration): readonly TypescriptAnnotatedDeclaration[] =>
      ts.isIdentifier(declaration.name)
        ? [{ declaration, name: declaration.name.text, packageKind, role, sourceFile }]
        : [],
  )
}

function isNamedArchitectureDeclaration(
  statement: ts.Statement,
): statement is (
  | ts.ClassDeclaration
  | ts.FunctionDeclaration
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration
  | ts.EnumDeclaration
) & { readonly name: ts.Identifier } {
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

type ImportedDeclaration =
  | { readonly importedName: string; readonly kind: 'named'; readonly moduleSpecifier: string }
  | { readonly kind: 'namespace'; readonly moduleSpecifier: string }

function typeReferencesDeclaration(
  typeNode: ts.TypeNode | undefined,
  sourceFile: ts.SourceFile,
  expectedDeclaration: TypescriptAnnotatedDeclaration,
  imports: ReadonlyMap<string, ImportedDeclaration>,
): boolean {
  return typeNode === undefined
    ? false
    : nodeReferencesDeclaration(typeNode, sourceFile, expectedDeclaration, imports)
}

function nodeReferencesDeclaration(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  expectedDeclaration: TypescriptAnnotatedDeclaration,
  imports: ReadonlyMap<string, ImportedDeclaration>,
): boolean {
  if (namespaceImportReferencesDeclaration(node, sourceFile, expectedDeclaration, imports)) {
    return true
  }
  if (ts.isIdentifier(node)) {
    const imported = imports.get(node.text)
    if (imported?.kind === 'named') {
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

function namespaceImportReferencesDeclaration(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  expectedDeclaration: TypescriptAnnotatedDeclaration,
  imports: ReadonlyMap<string, ImportedDeclaration>,
): boolean {
  const reference = namespaceReference(node)
  if (reference === undefined) return false
  const imported = imports.get(reference.namespaceName)
  return (
    imported?.kind === 'namespace' &&
    reference.declarationName === declarationExportName(expectedDeclaration) &&
    moduleReferencesSource(sourceFile.fileName, imported.moduleSpecifier, expectedDeclaration)
  )
}

function namespaceReference(
  node: ts.Node,
): { readonly declarationName: string; readonly namespaceName: string } | undefined {
  if (ts.isQualifiedName(node) && ts.isIdentifier(node.left)) {
    return { declarationName: node.right.text, namespaceName: node.left.text }
  }
  if (!ts.isPropertyAccessExpression(node)) return undefined
  if (!ts.isIdentifier(node.expression)) return undefined
  return { declarationName: node.name.text, namespaceName: node.expression.text }
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
        kind: 'named',
        moduleSpecifier: statement.moduleSpecifier.text,
      })
    }
    const bindings = importClause.namedBindings
    if (bindings === undefined) continue
    if (ts.isNamespaceImport(bindings)) {
      imports.set(bindings.name.text, {
        kind: 'namespace',
        moduleSpecifier: statement.moduleSpecifier.text,
      })
      continue
    }
    for (const element of bindings.elements) {
      imports.set(element.name.text, {
        importedName: element.propertyName?.text ?? element.name.text,
        kind: 'named',
        moduleSpecifier: statement.moduleSpecifier.text,
      })
    }
  }
  return imports
}

function declarationExportName(declaration: TypescriptAnnotatedDeclaration): string {
  return hasModifier(declaration.declaration, ts.SyntaxKind.DefaultKeyword)
    ? 'default'
    : declaration.name
}

function moduleReferencesSource(
  importingSourcePath: string,
  moduleSpecifier: string,
  expectedDeclaration: TypescriptAnnotatedDeclaration,
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
    path.join(extensionlessPath, 'index.mts'),
    path.join(extensionlessPath, 'index.cts'),
  ]
}

function uniqueText(items: readonly string[]): readonly string[] {
  return [...new Set(items)].sort(compareTypescriptText)
}

function uniqueRelationships(
  relationships: readonly TypescriptArchitectureRelationship[],
): readonly TypescriptArchitectureRelationship[] {
  const unique = new Map(
    relationships.map((relationship) => [
      `${relationship.role}:${relationship.name}`,
      { name: relationship.name, role: relationship.role },
    ]),
  )
  return [...unique.values()].sort((left, right) =>
    compareTypescriptText(`${left.role}:${left.name}`, `${right.role}:${right.name}`),
  )
}

function compareArchitectureItems(
  left: TypescriptArchitectureItem,
  right: TypescriptArchitectureItem,
): number {
  return (
    compareTypescriptText(left.name, right.name) ||
    compareTypescriptText(typescriptArchitectureItemKey(left), typescriptArchitectureItemKey(right))
  )
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
  return (
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node)?.some((item) => item.kind === modifier) ?? false)
  )
}

function isExported(node: ts.Node): boolean {
  return hasModifier(node, ts.SyntaxKind.ExportKeyword)
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
