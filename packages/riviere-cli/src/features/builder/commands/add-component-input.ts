/** @riviere-role command-use-case-input */
export interface AddComponentInput {
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
