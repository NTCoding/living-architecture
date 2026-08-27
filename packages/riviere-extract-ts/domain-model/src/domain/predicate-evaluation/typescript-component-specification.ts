import type { Predicate } from '@living-architecture/riviere-extract-config-published-language'
import type {
  ClassDeclaration,
  Decorator,
  FunctionDeclaration,
  MethodDeclaration,
  Node,
} from 'ts-morph'
import { Node as TsMorphNode } from 'ts-morph'

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

/** @riviere-role value-object */
export class TypeScriptComponentSpecification {
  declare private readonly brand: 'TypeScriptComponentSpecification'

  private constructor(private readonly predicate: Predicate) {}

  static fromPredicate(predicate: Predicate): TypeScriptComponentSpecification {
    return new TypeScriptComponentSpecification(predicate)
  }

  isSatisfiedBy(node: Node): boolean {
    return this.evaluate(node, this.predicate)
  }

  private evaluate(node: Node, predicate: Predicate): boolean {
    switch (predicate.kind) {
      case 'hasDecorator':
        return evaluateHasDecorator(node, predicate.decoratorNames, predicate.fromPackage)
      case 'hasJSDoc':
        return evaluateHasJSDoc(node, predicate.tagName)
      case 'extendsClass':
        return evaluateExtendsClass(node, predicate.className)
      case 'implementsInterface':
        return evaluateImplementsInterface(node, predicate.interfaceName)
      case 'nameEndsWith':
        return evaluateNameEndsWith(node, predicate.suffix)
      case 'nameMatches':
        return evaluateNameMatches(node, predicate.pattern)
      case 'inClassWith':
        return this.evaluateInClassWith(node, predicate.predicate)
      case 'and':
        return predicate.predicates.every((nested) => this.evaluate(node, nested))
      case 'or':
        return predicate.predicates.some((nested) => this.evaluate(node, nested))
    }
  }

  private evaluateInClassWith(node: Node, predicate: Predicate): boolean {
    if (!TsMorphNode.isMethodDeclaration(node)) return false
    const parent = node.getParent()
    return TsMorphNode.isClassDeclaration(parent) && this.evaluate(parent, predicate)
  }
}

function evaluateHasDecorator(
  node: Node,
  decoratorNames: readonly string[],
  fromPackage?: string,
): boolean {
  if (!isDecoratableNode(node)) {
    return false
  }

  const decorators = node.getDecorators()
  return decorators.some((d) => {
    if (!decoratorNames.includes(d.getName())) {
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
  if (name === undefined) return false

  return name.endsWith(suffix)
}

function evaluateNameMatches(node: Node, pattern: string): boolean {
  if (!isNameableNode(node)) {
    return false
  }

  const name = node.getName()
  if (name === undefined) return false

  const regex = new RegExp(pattern)
  return regex.test(name)
}
