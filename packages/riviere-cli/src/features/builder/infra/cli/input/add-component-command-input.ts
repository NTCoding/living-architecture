import {
  isValidComponentType,
  VALID_COMPONENT_TYPES,
} from '../../../../../platform/infra/cli/input/component-types'
import {
  buildDomainInput,
  type AddComponentInput,
} from '../../../../../platform/infra/cli/input/add-component-input-mapper'
import { resolveGraphPath } from '../../../../../platform/infra/graph-persistence/graph-path'

export interface AddComponentCliOptions {
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
  customProperty: string[]
  description?: string
  lineNumber?: string
  graph?: string
  json?: boolean
}

/** @riviere-role application-error */
export class InvalidLineNumberError extends Error {
  constructor() {
    super('Invalid line number: must be a positive integer')
    this.name = 'InvalidLineNumberError'
  }
}

/** @riviere-role application-error */
export class InvalidComponentTypeOptionError extends Error {
  constructor(componentType: string) {
    super(`Invalid component type: ${componentType}`)
    this.name = 'InvalidComponentTypeOptionError'
  }
}

/** @riviere-role cli-input-mapper */
export function buildAddComponentCommandInput(options: AddComponentCliOptions): {
  graphPath: string
  component: ReturnType<typeof buildDomainInput>
} {
  if (!isValidComponentType(options.type)) {
    throw new InvalidComponentTypeOptionError(options.type)
  }

  const lineNumber = parseLineNumber(options.lineNumber)
  const mapperInput: AddComponentInput = {
    componentType: options.type,
    name: options.name,
    domain: options.domain,
    module: options.module,
    repository: options.repository,
    filePath: options.filePath,
    graphPath: resolveGraphPath(options.graph),
    outputJson: options.json ?? false,
  }

  if (lineNumber !== undefined) {
    mapperInput.lineNumber = lineNumber
  }

  mapOptionalStringFields(mapperInput, options)

  if (options.customProperty.length > 0) {
    mapperInput.customProperty = options.customProperty
  }

  return {
    graphPath: mapperInput.graphPath,
    component: buildDomainInput(mapperInput),
  }
}

/** @riviere-role cli-input-mapper */
function mapOptionalStringFields(
  mapperInput: AddComponentInput,
  options: AddComponentCliOptions,
): void {
  const optionalStringFields = [
    ['route', options.route],
    ['apiType', options.apiType],
    ['httpMethod', options.httpMethod],
    ['httpPath', options.httpPath],
    ['operationName', options.operationName],
    ['entity', options.entity],
    ['eventName', options.eventName],
    ['eventSchema', options.eventSchema],
    ['subscribedEvents', options.subscribedEvents],
    ['customType', options.customType],
    ['description', options.description],
  ] as const

  for (const [key, value] of optionalStringFields) {
    if (value !== undefined) {
      Object.assign(mapperInput, { [key]: value })
    }
  }
}

/** @riviere-role cli-input-mapper */
function parseLineNumber(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined
  }

  const parsed = Number.parseInt(value, 10)

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new InvalidLineNumberError()
  }

  return parsed
}

/** @riviere-role cli-input-mapper */
export function getValidComponentTypes(): readonly string[] {
  return VALID_COMPONENT_TYPES
}
