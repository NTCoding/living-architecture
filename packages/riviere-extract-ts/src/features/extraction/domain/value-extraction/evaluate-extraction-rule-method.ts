import type {
  FromMethodSignatureExtractionRule,
  FromConstructorParamsExtractionRule,
  FromParameterTypeExtractionRule,
} from '@living-architecture/riviere-extract-config'
import type {
  ClassDeclaration, MethodDeclaration, ParameterDeclaration 
} from 'ts-morph'
import { applyTransforms } from '../../../../platform/domain/string-transforms/transforms'
import { ExtractionError } from '../../../../platform/domain/ast-literals/literal-detection'

/** @riviere-role value-object */
export type ParameterInfo = {
  name: string
  type: string
}

/** @riviere-role value-object */
export type MethodSignature = {
  parameters: ParameterInfo[]
  returnType: string
}

type MethodExtractionValue = string | ParameterInfo[] | MethodSignature

/** @riviere-role value-object */
export type MethodExtractionResult = { value: MethodExtractionValue }

function extractParameterInfo(param: ParameterDeclaration): ParameterInfo {
  const typeNode = param.getTypeNode()
  return {
    name: param.getName(),
    type: typeNode?.getText() ?? 'unknown',
  }
}

/** @riviere-role domain-service */
export function evaluateFromMethodSignatureRule(
  _rule: FromMethodSignatureExtractionRule,
  methodDecl: MethodDeclaration,
): MethodExtractionResult {
  const parameters = methodDecl.getParameters().map(extractParameterInfo)
  const returnTypeNode = methodDecl.getReturnTypeNode()

  return {
    value: {
      parameters,
      returnType: returnTypeNode?.getText() ?? 'unknown',
    },
  }
}

/** @riviere-role domain-service */
export function evaluateFromConstructorParamsRule(
  _rule: FromConstructorParamsExtractionRule,
  classDecl: ClassDeclaration,
): MethodExtractionResult {
  const ctor = classDecl.getConstructors()[0]
  if (ctor === undefined) {
    return { value: [] }
  }

  const parameters = ctor.getParameters().map(extractParameterInfo)
  return { value: parameters }
}

/** @riviere-role domain-service */
export function evaluateFromParameterTypeRule(
  rule: FromParameterTypeExtractionRule,
  methodDecl: MethodDeclaration,
): MethodExtractionResult {
  const {
    position, transform 
  } = rule.fromParameterType

  const params = methodDecl.getParameters()
  const param = params[position]
  if (param === undefined) {
    throw new ExtractionError(
      `Parameter position ${position} out of bounds. Method has ${params.length} parameter(s)`,
      methodDecl.getSourceFile().getFilePath(),
      methodDecl.getStartLineNumber(),
    )
  }

  const typeNode = param.getTypeNode()
  const typeName = typeNode?.getText() ?? 'unknown'

  if (transform === undefined) {
    return { value: typeName }
  }

  return { value: applyTransforms(typeName, transform) }
}
