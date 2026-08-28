import ts from 'typescript'
import type {
  AnnotatedDeclaration,
  DomainConcept,
  DomainConceptRole,
  ParsedSource,
} from './domain-guide-source'

/** @riviere-role external-client-service */
export function classTypePaths(
  declaration: AnnotatedDeclaration['declaration'],
  sourceFile: ts.SourceFile,
): ReadonlyMap<string, string> {
  if (!ts.isClassDeclaration(declaration)) {
    return new Map()
  }
  const paths = new Map<string, string>()
  for (const member of declaration.members) {
    if (ts.isPropertyDeclaration(member) && ts.isIdentifier(member.name)) {
      addTypePath(paths, `this.${member.name.text}`, member.type)
    }
    if (ts.isConstructorDeclaration(member)) {
      addConstructorTypePaths(paths, member)
    }
  }
  return expandInterfaceProperties(paths, sourceFile)
}

/** @riviere-role external-client-service */
export function parameterTypePaths(
  parameters: ts.NodeArray<ts.ParameterDeclaration>,
  sourceFile: ts.SourceFile,
): ReadonlyMap<string, string> {
  const paths = new Map<string, string>()
  for (const parameter of parameters) {
    if (ts.isIdentifier(parameter.name)) {
      addTypePath(paths, parameter.name.text, parameter.type)
    }
  }
  return expandInterfaceProperties(paths, sourceFile)
}

/** @riviere-role external-client-service */
export function importedDomainConcepts(
  sourceFile: ts.SourceFile,
  domainModelPackageName: string,
  domainConcepts: ReadonlyMap<string, DomainConcept>,
): ReadonlyMap<string, DomainConcept> {
  const imports = new Map<string, DomainConcept>()
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue
    }
    if (!isPackageImport(statement.moduleSpecifier.text, domainModelPackageName)) {
      continue
    }
    const bindings = statement.importClause?.namedBindings
    if (bindings === undefined || !ts.isNamedImports(bindings)) {
      continue
    }
    for (const element of bindings.elements) {
      const importedName = element.propertyName?.text ?? element.name.text
      const concept = domainConcepts.get(importedName)
      if (concept !== undefined) {
        imports.set(element.name.text, concept)
      }
    }
  }
  return imports
}

/** @riviere-role external-client-service */
export function conceptInType(
  typeNode: ts.TypeNode,
  importedConcepts: ReadonlyMap<string, DomainConcept>,
  role: DomainConceptRole,
): DomainConcept | undefined {
  return matchingConceptInNode(typeNode, importedConcepts, role)
}

function matchingConceptInNode(
  node: ts.Node,
  importedConcepts: ReadonlyMap<string, DomainConcept>,
  role: DomainConceptRole,
): DomainConcept | undefined {
  if (ts.isIdentifier(node)) {
    const concept = importedConcepts.get(node.text)
    if (concept?.role === role) {
      return concept
    }
  }
  return node.forEachChild((child) => matchingConceptInNode(child, importedConcepts, role))
}

function addConstructorTypePaths(
  paths: Map<string, string>,
  constructor: ts.ConstructorDeclaration,
): void {
  for (const parameter of constructor.parameters) {
    if (ts.isIdentifier(parameter.name) && hasParameterPropertyModifier(parameter)) {
      addTypePath(paths, `this.${parameter.name.text}`, parameter.type)
    }
  }
}

/** @riviere-role external-client-service */
export function annotatedDeclarations(
  sources: readonly ParsedSource[],
): readonly AnnotatedDeclaration[] {
  return sources.flatMap(({ sourceFile }) =>
    sourceFile.statements.flatMap((statement) => {
      if (!ts.isClassDeclaration(statement) && !ts.isFunctionDeclaration(statement)) {
        return []
      }
      const role = roleAnnotation(statement)
      const name = statement.name?.text
      if (role === undefined || name === undefined || !isExported(statement)) {
        return []
      }
      return [{ declaration: statement, name, role, sourceFile }]
    }),
  )
}

/** @riviere-role external-client-service */
export function expressionPath(expression: ts.Expression): string | undefined {
  if (ts.isIdentifier(expression)) {
    return expression.text
  }
  if (expression.kind === ts.SyntaxKind.ThisKeyword) {
    return 'this'
  }
  if (!ts.isPropertyAccessExpression(expression)) {
    return undefined
  }
  const parentPath = expressionPath(expression.expression)
  return parentPath === undefined ? undefined : `${parentPath}.${expression.name.text}`
}

/** @riviere-role external-client-service */
export function visit(node: ts.Node, visitor: (node: ts.Node) => void): void {
  visitor(node)
  node.forEachChild((child) => visit(child, visitor))
}

function expandInterfaceProperties(
  basePaths: ReadonlyMap<string, string>,
  sourceFile: ts.SourceFile,
): ReadonlyMap<string, string> {
  const paths = new Map(basePaths)
  const interfaces = new Map<string, ts.InterfaceDeclaration>()
  for (const statement of sourceFile.statements) {
    if (ts.isInterfaceDeclaration(statement)) {
      interfaces.set(statement.name.text, statement)
    }
  }
  for (const [basePath, typeName] of basePaths) {
    const declaration = interfaces.get(typeName)
    if (declaration === undefined) {
      continue
    }
    for (const member of declaration.members) {
      if (ts.isPropertySignature(member) && ts.isIdentifier(member.name)) {
        addTypePath(paths, `${basePath}.${member.name.text}`, member.type)
      }
    }
  }
  return paths
}

function addTypePath(
  paths: Map<string, string>,
  propertyPath: string,
  typeNode: ts.TypeNode | undefined,
): void {
  const typeName = directTypeName(typeNode)
  if (typeName !== undefined) {
    paths.set(propertyPath, typeName)
  }
}

function directTypeName(typeNode: ts.TypeNode | undefined): string | undefined {
  if (typeNode === undefined || !ts.isTypeReferenceNode(typeNode)) {
    return undefined
  }
  if (ts.isIdentifier(typeNode.typeName)) {
    return typeNode.typeName.text
  }
  return typeNode.typeName.right.text
}

function roleAnnotation(node: ts.Node): string | undefined {
  for (const tag of ts.getJSDocTags(node)) {
    if (tag.tagName.text === 'riviere-role' && typeof tag.comment === 'string') {
      return tag.comment.trim()
    }
  }
  return undefined
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

function isPackageImport(moduleSpecifier: string, packageName: string): boolean {
  return moduleSpecifier === packageName || moduleSpecifier.startsWith(`${packageName}/`)
}
