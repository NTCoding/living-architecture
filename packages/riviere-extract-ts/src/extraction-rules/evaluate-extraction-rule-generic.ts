import type { FromGenericArgExtractionRule } from '@living-architecture/riviere-extract-config'
import type { ClassDeclaration } from 'ts-morph'
import { SyntaxKind } from 'ts-morph'
import { applyTransforms } from './transforms'
import { ExtractionError } from './literal-detection'

type GenericExtractionResult = { value: string[] }

function getInterfaceTypeArgs(
  classDecl: ClassDeclaration,
  interfaceName: string,
): import('ts-morph').TypeNode[] | undefined {
  const implementsClause = classDecl.getImplements()

  for (const impl of implementsClause) {
    const expression = impl.getExpression()
    if (expression.getText() === interfaceName) {
      return impl.getTypeArguments()
    }
  }

  return undefined
}

function extractTypeNames(typeNode: import('ts-morph').TypeNode): string[] {
  if (typeNode.getKind() === SyntaxKind.UnionType) {
    const unionType = typeNode.asKindOrThrow(SyntaxKind.UnionType)
    return unionType.getTypeNodes().map((t) => t.getText())
  }
  return [typeNode.getText()]
}

export function evaluateFromGenericArgRule(
  rule: FromGenericArgExtractionRule,
  classDecl: ClassDeclaration,
): GenericExtractionResult {
  const {
    interface: interfaceName, position, transform 
  } = rule.fromGenericArg

  const sourceFile = classDecl.getSourceFile()
  const location = {
    filePath: sourceFile.getFilePath(),
    line: classDecl.getStartLineNumber(),
  }

  const typeArgs = getInterfaceTypeArgs(classDecl, interfaceName)
  if (typeArgs === undefined) {
    throw new ExtractionError(
      `Class '${classDecl.getName() ?? 'anonymous'}' does not implement interface '${interfaceName}'`,
      location.filePath,
      location.line,
    )
  }

  const typeArg = typeArgs[position]
  if (typeArg === undefined) {
    throw new ExtractionError(
      `Position ${position} out of bounds. Interface has ${typeArgs.length} type argument(s)`,
      location.filePath,
      location.line,
    )
  }

  if (typeArg.getKind() === SyntaxKind.TypeReference) {
    const typeRef = typeArg.asKindOrThrow(SyntaxKind.TypeReference)
    const typeName = typeRef.getTypeName()
    if (typeName.getKind() === SyntaxKind.Identifier) {
      const classTypeParams = classDecl.getTypeParameters()
      const paramName = typeName.getText()
      const isTypeParam = classTypeParams.some((p) => p.getName() === paramName)
      if (isTypeParam) {
        throw new ExtractionError(
          `Generic argument at position ${position} is type parameter '${paramName}', expected concrete type`,
          location.filePath,
          location.line,
        )
      }
    }
  }

  const typeNames = extractTypeNames(typeArg)

  if (transform === undefined) {
    return { value: typeNames }
  }

  return { value: typeNames.map((name) => applyTransforms(name, transform)) }
}
