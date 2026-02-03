import type {
  OperationSignature, OperationParameter 
} from '@living-architecture/riviere-schema'

function parseParameter(input: string): OperationParameter | undefined {
  const parts = input.split(':')
  if (parts.length < 2 || parts.length > 3) {
    return undefined
  }
  const [name, type, description] = parts
  if (name === undefined || name === '' || type === undefined || type === '') {
    return undefined
  }
  return {
    name: name.trim(),
    type: type.trim(),
    ...(description !== undefined && description !== '' && { description: description.trim() }),
  }
}

type SignatureParseResult =
  | {
    success: true
    signature: OperationSignature
  }
  | {
    success: false
    error: string
  }

type ParametersParseResult =
  | {
    success: true
    parameters: OperationParameter[]
  }
  | {
    success: false
    error: string
  }

function parseParameters(paramsPart: string): ParametersParseResult {
  if (paramsPart === '') {
    return {
      success: true,
      parameters: [],
    }
  }
  const paramStrings = paramsPart.split(',').map((p) => p.trim())
  const parameters: OperationParameter[] = []
  for (const paramStr of paramStrings) {
    const param = parseParameter(paramStr)
    if (param === undefined) {
      return {
        success: false,
        error: `Invalid parameter format: '${paramStr}'. Expected 'name:type' or 'name:type:description'.`,
      }
    }
    parameters.push(param)
  }
  return {
    success: true,
    parameters,
  }
}

function buildSignatureObject(
  parameters: OperationParameter[],
  returnType: string | undefined,
): OperationSignature {
  const signature: OperationSignature = {}
  if (parameters.length > 0) {
    signature.parameters = parameters
  }
  if (returnType !== undefined && returnType !== '') {
    signature.returnType = returnType
  }
  return signature
}

export function parseSignature(input: string): SignatureParseResult {
  const trimmed = input.trim()

  // Handle "-> ReturnType" (return type only, no parameters)
  if (trimmed.startsWith('->')) {
    const returnType = trimmed.slice(2).trim()
    return returnType === ''
      ? {
        success: false,
        error: `Invalid signature format: '${input}'. Return type cannot be empty.`,
      }
      : {
        success: true,
        signature: { returnType },
      }
  }

  // Split on " -> " to separate parameters from return type
  const arrowIndex = trimmed.indexOf(' -> ')
  const paramsPart = arrowIndex === -1 ? trimmed : trimmed.slice(0, arrowIndex).trim()
  const returnType = arrowIndex === -1 ? undefined : trimmed.slice(arrowIndex + 4).trim()

  const paramsResult = parseParameters(paramsPart)
  if (!paramsResult.success) {
    return paramsResult
  }

  const signature = buildSignatureObject(paramsResult.parameters, returnType)

  // Must have at least parameters or returnType
  if (paramsResult.parameters.length === 0 && returnType === undefined) {
    return {
      success: false,
      error: `Invalid signature format: '${input}'. Expected 'param:type, ... -> ReturnType' or '-> ReturnType' or 'param:type'.`,
    }
  }

  return {
    success: true,
    signature,
  }
}
