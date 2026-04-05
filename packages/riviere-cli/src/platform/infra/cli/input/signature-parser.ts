import type {
  OperationParameter, OperationSignature 
} from '@living-architecture/riviere-schema'

function parseParameter(input: string): OperationParameter | undefined {
  const parts = input.split(':')
  if (parts.length < 2 || parts.length > 3) return undefined
  const [name, type, description] = parts
  if (name === undefined || name === '' || type === undefined || type === '') return undefined
  return {
    ...(description !== undefined && description !== '' ? { description: description.trim() } : {}),
    name: name.trim(),
    type: type.trim(),
  }
}

type SignatureParseResult =
  | {
    signature: OperationSignature
    success: true
  }
  | {
    error: string
    success: false
  }
type ParametersParseResult =
  | {
    parameters: OperationParameter[]
    success: true
  }
  | {
    error: string
    success: false
  }

function parseParameters(paramsPart: string): ParametersParseResult {
  if (paramsPart === '')
    return {
      parameters: [],
      success: true,
    }
  const paramStrings = paramsPart.split(',').map((p) => p.trim())
  const parameters: OperationParameter[] = []
  for (const paramStr of paramStrings) {
    const param = parseParameter(paramStr)
    if (param === undefined)
      return {
        error: `Invalid parameter format: '${paramStr}'. Expected 'name:type' or 'name:type:description'.`,
        success: false,
      }
    parameters.push(param)
  }
  return {
    parameters,
    success: true,
  }
}

function buildSignatureObject(
  parameters: OperationParameter[],
  returnType: string | undefined,
): OperationSignature {
  const signature: OperationSignature = {}
  if (parameters.length > 0) signature.parameters = parameters
  if (returnType !== undefined && returnType !== '') signature.returnType = returnType
  return signature
}

/** @riviere-role cli-input-validator */
export function parseSignature(input: string): SignatureParseResult {
  const trimmed = input.trim()
  if (trimmed.startsWith('->')) {
    const returnType = trimmed.slice(2).trim()
    return returnType === ''
      ? {
        error: `Invalid signature format: '${input}'. Return type cannot be empty.`,
        success: false,
      }
      : {
        signature: { returnType },
        success: true,
      }
  }
  const arrowIndex = trimmed.indexOf(' -> ')
  const paramsPart = arrowIndex === -1 ? trimmed : trimmed.slice(0, arrowIndex).trim()
  const returnType = arrowIndex === -1 ? undefined : trimmed.slice(arrowIndex + 4).trim()
  const paramsResult = parseParameters(paramsPart)
  if (!paramsResult.success) return paramsResult
  const signature = buildSignatureObject(paramsResult.parameters, returnType)
  if (paramsResult.parameters.length === 0 && returnType === undefined) {
    return {
      error: `Invalid signature format: '${input}'. Expected 'param:type, ... -> ReturnType' or '-> ReturnType' or 'param:type'.`,
      success: false,
    }
  }
  return {
    signature,
    success: true,
  }
}
