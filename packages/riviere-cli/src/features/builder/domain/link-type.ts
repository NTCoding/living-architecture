import { z } from 'zod'

const linkTypeSchema = z.enum(['sync', 'async'])
type LinkTypeValue = z.infer<typeof linkTypeSchema>

/** @riviere-role value-object */
export class LinkType {
  declare private readonly brand: 'LinkType'
  readonly value: LinkTypeValue

  private constructor(value: LinkTypeValue) {
    this.value = value
  }

  static parse(value: string) {
    const parsed = linkTypeSchema.safeParse(value)
    return parsed.success
      ? {
        data: new LinkType(parsed.data),
        success: true as const,
      }
      : parsed
  }
}
