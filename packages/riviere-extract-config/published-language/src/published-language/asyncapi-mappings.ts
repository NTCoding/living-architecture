import { z } from 'zod'

/** @riviere-role published-language-data-structure */
export interface AsyncApiMessageMapping {
  readonly domain: string
  readonly module: string
  readonly name: string
}

/** @riviere-role published-language-enumeration */
export const ASYNCAPI_OPERATION_TYPES = [
  'API',
  'UseCase',
  'DomainOp',
  'Event',
  'EventHandler',
] as const

/** @riviere-role published-language-enumeration-type */
export type AsyncApiOperationType = (typeof ASYNCAPI_OPERATION_TYPES)[number]

/** @riviere-role published-language-data-structure */
export interface AsyncApiOperationMapping {
  readonly type: AsyncApiOperationType
  readonly domain: string
  readonly module: string
  readonly name: string
}

/** @riviere-role published-language-schema */
export interface AsyncApiMappings {
  readonly messages: Readonly<Record<string, AsyncApiMessageMapping>>
  readonly operations: Readonly<Record<string, AsyncApiOperationMapping>>
}

const nonEmptyString = z.string().trim().min(1)
const operationTypesSchema = z.enum(ASYNCAPI_OPERATION_TYPES)

const messageMappingSchema = z.strictObject({
  domain: nonEmptyString,
  module: nonEmptyString,
  name: nonEmptyString,
})

const operationMappingSchema = z.strictObject({
  type: operationTypesSchema,
  domain: nonEmptyString,
  module: nonEmptyString,
  name: nonEmptyString,
})

const mappingsSchema = z.strictObject({
  messages: z.record(nonEmptyString, messageMappingSchema).default({}),
  operations: z.record(nonEmptyString, operationMappingSchema).default({}),
})

/** @riviere-role published-language-parser */
export function parseAsyncApiMappings(
  value: unknown,
): { success: true; mappings: AsyncApiMappings } | { success: false; issues: readonly string[] } {
  const result = mappingsSchema.safeParse(value)
  if (!result.success) {
    return {
      success: false,
      issues: result.error.issues.map(
        (issue) => `${issue.path.length === 0 ? '/' : issue.path.join('.')}: ${issue.message}`,
      ),
    }
  }
  return {
    success: true,
    mappings: result.data,
  }
}
