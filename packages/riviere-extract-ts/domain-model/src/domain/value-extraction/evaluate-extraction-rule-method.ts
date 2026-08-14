import type {
  FromConstructorParamsExtractionRule,
  FromMethodSignatureExtractionRule,
  FromParameterTypeExtractionRule,
} from '@living-architecture/riviere-extract-config-published-language'
import type { ClassDeclaration, MethodDeclaration, ParameterDeclaration } from 'ts-morph'
import { ExtractionError } from './literal-detection'
import { applyTransforms } from './transforms'
import { MethodExtractionResult, MethodSignature, ParameterInfo } from './method-extraction-result'

function extractParameterInfo(param: ParameterDeclaration): ParameterInfo {
  const typeNode = param.getTypeNode()
  return ParameterInfo.parse({
    name: param.getName(),
    type: typeNode?.getText() ?? 'unknown',
  })
}

/** @riviere-role domain-service */
export function evaluateFromMethodSignatureRule(
  _rule: FromMethodSignatureExtractionRule,
  methodDecl: MethodDeclaration,
): MethodExtractionResult {
  const parameters = methodDecl.getParameters().map(extractParameterInfo)
  const returnTypeNode = methodDecl.getReturnTypeNode()

  return MethodExtractionResult.parse({
    value: MethodSignature.parse({
      parameters,
      returnType: returnTypeNode?.getText() ?? 'unknown',
    }),
  })
}

/** @riviere-role domain-service */
export function evaluateFromConstructorParamsRule(
  _rule: FromConstructorParamsExtractionRule,
  classDecl: ClassDeclaration,
): MethodExtractionResult {
  const ctor = classDecl.getConstructors()[0]
  if (ctor === undefined) {
    return MethodExtractionResult.parse({ value: [] })
  }

  const parameters = ctor.getParameters().map(extractParameterInfo)
  return MethodExtractionResult.parse({ value: parameters })
}

/** @riviere-role domain-service */
export function evaluateFromParameterTypeRule(
  rule: FromParameterTypeExtractionRule,
  methodDecl: MethodDeclaration,
): MethodExtractionResult {
  const { position, transform } = rule.fromParameterType

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
    return MethodExtractionResult.parse({ value: typeName })
  }

  return MethodExtractionResult.parse({ value: applyTransforms(typeName, transform) })
}
