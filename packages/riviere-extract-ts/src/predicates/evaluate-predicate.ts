import type {
  ClassDeclaration,
  Decorator,
  FunctionDeclaration,
  MethodDeclaration,
  Node,
} from 'ts-morph'
import { Node as TsMorphNode } from 'ts-morph'
import type { Predicate } from '@living-architecture/riviere-extract-config'

type DecoratableNode = ClassDeclaration | MethodDeclaration

function isDecoratableNode(node: Node): node is DecoratableNode {
  return TsMorphNode.isClassDeclaration(node) || TsMorphNode.isMethodDeclaration(node)
}

type JSDocableNode = MethodDeclaration | FunctionDeclaration | ClassDeclaration

function isJSDocableNode(node: Node): node is JSDocableNode {
  return (
    TsMorphNode.isMethodDeclaration(node) ||
    TsMorphNode.isFunctionDeclaration(node) ||
    TsMorphNode.isClassDeclaration(node)
  )
}

type NameableNode = ClassDeclaration | MethodDeclaration | FunctionDeclaration

function isNameableNode(node: Node): node is NameableNode {
  return (
    TsMorphNode.isClassDeclaration(node) ||
    TsMorphNode.isMethodDeclaration(node) ||
    TsMorphNode.isFunctionDeclaration(node)
  )
}

/**
 * Evaluates a predicate against an AST node.
 * @param node - The AST node to test.
 * @param predicate - The predicate to evaluate.
 * @returns True if the node matches the predicate.
 */
export function evaluatePredicate(node: Node, predicate: Predicate): boolean {
  if ('hasDecorator' in predicate) {
    return evaluateHasDecorator(node, predicate.hasDecorator.name, predicate.hasDecorator.from)
  }
  if ('hasJSDoc' in predicate) {
    return evaluateHasJSDoc(node, predicate.hasJSDoc.tag)
  }
  if ('extendsClass' in predicate) {
    return evaluateExtendsClass(node, predicate.extendsClass.name)
  }
  if ('implementsInterface' in predicate) {
    return evaluateImplementsInterface(node, predicate.implementsInterface.name)
  }
  if ('nameEndsWith' in predicate) {
    return evaluateNameEndsWith(node, predicate.nameEndsWith.suffix)
  }
  if ('nameMatches' in predicate) {
    return evaluateNameMatches(node, predicate.nameMatches.pattern)
  }
  if ('inClassWith' in predicate) {
    return evaluateInClassWith(node, predicate.inClassWith)
  }
  if ('and' in predicate) {
    return predicate.and.every((p) => evaluatePredicate(node, p))
  }
  /* istanbul ignore else -- @preserve: false branch leads to unreachable code; Predicate is exhaustive union */
  if ('or' in predicate) {
    return predicate.or.some((p) => evaluatePredicate(node, p))
  }
  /* istanbul ignore next -- @preserve: unreachable with valid Predicate type */
  return false
}

function evaluateHasDecorator(
  node: Node,
  decoratorName: string | string[],
  fromPackage?: string,
): boolean {
  if (!isDecoratableNode(node)) {
    return false
  }

  const decorators = node.getDecorators()
  const names = Array.isArray(decoratorName) ? decoratorName : [decoratorName]

  return decorators.some((d) => {
    if (!names.includes(d.getName())) {
      return false
    }
    if (fromPackage !== undefined) {
      return getDecoratorImportSource(d) === fromPackage
    }
    return true
  })
}

function getDecoratorImportSource(decorator: Decorator): string | undefined {
  const name = decorator.getName()
  const sourceFile = decorator.getSourceFile()
  const importDecl = sourceFile.getImportDeclaration((decl) => {
    const namedImports = decl.getNamedImports()
    return namedImports.some((n) => n.getName() === name)
  })
  return importDecl?.getModuleSpecifierValue()
}

function evaluateHasJSDoc(node: Node, tagName: string): boolean {
  if (!isJSDocableNode(node)) {
    return false
  }

  const jsDocs = node.getJsDocs()
  return jsDocs.some((jsDoc) => {
    const tags = jsDoc.getTags()
    return tags.some((tag) => tag.getTagName() === tagName)
  })
}

function evaluateExtendsClass(node: Node, className: string): boolean {
  if (!TsMorphNode.isClassDeclaration(node)) {
    return false
  }

  const extendsExpr = node.getExtends()
  if (extendsExpr === undefined) {
    return false
  }

  return extendsExpr.getText() === className
}

function evaluateImplementsInterface(node: Node, interfaceName: string): boolean {
  if (!TsMorphNode.isClassDeclaration(node)) {
    return false
  }

  const implementsExprs = node.getImplements()
  return implementsExprs.some((impl) => impl.getText() === interfaceName)
}

function evaluateNameEndsWith(node: Node, suffix: string): boolean {
  if (!isNameableNode(node)) {
    return false
  }

  const name = node.getName()
  /* istanbul ignore next -- @preserve: Anonymous declarations have undefined names; predicate correctly returns false */
  if (name === undefined) return false

  return name.endsWith(suffix)
}

function evaluateNameMatches(node: Node, pattern: string): boolean {
  if (!isNameableNode(node)) {
    return false
  }

  const name = node.getName()
  /* istanbul ignore next -- @preserve: Anonymous declarations have undefined names; predicate correctly returns false */
  if (name === undefined) return false

  const regex = new RegExp(pattern)
  return regex.test(name)
}

function evaluateInClassWith(node: Node, predicate: Predicate): boolean {
  if (!TsMorphNode.isMethodDeclaration(node)) {
    return false
  }

  const parent = node.getParent()
  /* istanbul ignore next -- @preserve: Methods in object literals have non-class parents; predicate correctly returns false */
  if (!TsMorphNode.isClassDeclaration(parent)) return false

  return evaluatePredicate(parent, predicate)
}
