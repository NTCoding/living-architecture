import { z } from 'zod'

const httpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])
type HttpMethodValue = z.infer<typeof httpMethodSchema>

/** @riviere-role value-object */
export class HttpMethod {
  declare private brand: 'HttpMethod'
  readonly value: HttpMethodValue

  private constructor(value: HttpMethodValue) {
    this.value = value
  }

  static parse(value: string) {
    const parsed = httpMethodSchema.safeParse(value.toUpperCase())
    return parsed.success
      ? {
        data: new HttpMethod(parsed.data),
        success: true as const,
      }
      : parsed
  }
}
