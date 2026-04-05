interface AddComponentOptions {
  type: string
  name: string
  domain: string
  module: string
  repository: string
  filePath: string
  route?: string
  apiType?: string
  httpMethod?: string
  httpPath?: string
  operationName?: string
  entity?: string
  eventName?: string
  eventSchema?: string
  subscribedEvents?: string
  customType?: string
  customProperty?: string[]
  description?: string
  lineNumber?: string
  graph?: string
}

interface AddComponentCommandInput {
  componentType: string
  name: string
  domain: string
  module: string
  repository: string
  filePath: string
  graphPathOption?: string
  lineNumber?: number
  route?: string
  apiType?: string
  httpMethod?: string
  httpPath?: string
  operationName?: string
  entity?: string
  eventName?: string
  eventSchema?: string
  subscribedEvents?: string
  customType?: string
  customProperty?: string[]
  description?: string
}

/** @riviere-role cli-input-validator */
export function toAddComponentInput(options: AddComponentOptions): AddComponentCommandInput {
  return {
    ...withOptional('apiType', options.apiType),
    componentType: options.type,
    ...withNonEmptyArray('customProperty', options.customProperty),
    ...withOptional('customType', options.customType),
    ...withOptional('description', options.description),
    domain: options.domain,
    ...withOptional('entity', options.entity),
    ...withOptional('eventName', options.eventName),
    ...withOptional('eventSchema', options.eventSchema),
    filePath: options.filePath,
    ...withOptional('graphPathOption', options.graph),
    ...withOptional('httpMethod', options.httpMethod),
    ...withOptional('httpPath', options.httpPath),
    ...withParsedLineNumber(options.lineNumber),
    module: options.module,
    name: options.name,
    ...withOptional('operationName', options.operationName),
    repository: options.repository,
    ...withOptional('route', options.route),
    ...withOptional('subscribedEvents', options.subscribedEvents),
  }
}

function withOptional<Key extends keyof AddComponentCommandInput>(
  key: Key,
  value: AddComponentCommandInput[Key] | undefined,
): Partial<AddComponentCommandInput> {
  return value === undefined ? {} : { [key]: value }
}

function withNonEmptyArray<Key extends keyof AddComponentCommandInput>(
  key: Key,
  value: AddComponentCommandInput[Key],
): Partial<AddComponentCommandInput> {
  return Array.isArray(value) && value.length > 0 ? { [key]: value } : {}
}

function withParsedLineNumber(lineNumber: string | undefined): Partial<AddComponentCommandInput> {
  return lineNumber === undefined ? {} : { lineNumber: Number.parseInt(lineNumber, 10) }
}
