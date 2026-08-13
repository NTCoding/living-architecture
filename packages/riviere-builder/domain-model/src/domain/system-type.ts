import { z } from 'zod'

const systemTypeSchema = z.enum(['domain', 'bff', 'ui', 'external-service', 'other'])
type SystemTypeValue = z.infer<typeof systemTypeSchema>

/** @riviere-role value-object */
export class SystemType {
  declare private readonly brand: 'SystemType'
  readonly value: SystemTypeValue

  private constructor(value: SystemTypeValue) {
    this.value = value
  }

  static parse(value: string) {
    const parsed = systemTypeSchema.safeParse(value)
    return parsed.success
      ? {
          data: new SystemType(parsed.data),
          success: true as const,
        }
      : parsed
  }
}
