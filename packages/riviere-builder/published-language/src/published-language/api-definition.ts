import { z } from 'zod'
import { HttpMethod } from './http-method'

const apiTypeSchema = z.enum(['REST', 'GraphQL', 'other'])

/** @riviere-role value-object */
export class ApiDefinition {
  declare private readonly brand: 'ApiDefinition'

  private constructor(
    readonly apiType: 'REST' | 'GraphQL' | 'other',
    readonly httpMethod:
      | 'GET'
      | 'POST'
      | 'PUT'
      | 'PATCH'
      | 'DELETE'
      | 'HEAD'
      | 'OPTIONS'
      | undefined,
    readonly path: string | undefined,
  ) {}

  static parse(
    apiTypeInput: string | undefined,
    httpMethodInput: string | undefined,
    path: string | undefined,
  ) {
    const normalized = normalizeApiType(apiTypeInput)
    const apiType = apiTypeSchema.safeParse(normalized)
    if (!apiType.success)
      return { success: false as const, message: '--api-type is required for API component' }
    const httpMethod = httpMethodInput === undefined ? undefined : HttpMethod.parse(httpMethodInput)
    if (httpMethod !== undefined && !httpMethod.success)
      return { success: false as const, message: '--http-method is required for API component' }
    return {
      success: true as const,
      data: new ApiDefinition(apiType.data, httpMethod?.data.value, path),
    }
  }
}

function normalizeApiType(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  if (value.toLowerCase() === 'rest') return 'REST'
  if (value.toLowerCase() === 'graphql') return 'GraphQL'
  return value.toLowerCase()
}
