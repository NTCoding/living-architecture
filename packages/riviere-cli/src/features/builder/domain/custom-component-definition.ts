/** @riviere-role value-object */
export class CustomComponentDefinition {
  declare private readonly brand: 'CustomComponentDefinition'

  private constructor(
    readonly customTypeName: string,
    readonly metadata: Readonly<Record<string, string>> | undefined,
  ) {}

  static parse(name: string | undefined, properties: readonly string[] | undefined) {
    if (name === undefined || name.trim().length === 0) {
      return { success: false as const, message: '--custom-type is required for Custom component' }
    }
    const metadata: Record<string, string> = {}
    for (const property of properties ?? []) {
      const separator = property.indexOf(':')
      if (separator === -1) {
        return {
          success: false as const,
          message: `Invalid custom property format: ${property}. Expected 'key:value'`,
        }
      }
      metadata[property.slice(0, separator)] = property.slice(separator + 1)
    }
    return {
      success: true as const,
      data: new CustomComponentDefinition(
        name.trim(),
        Object.keys(metadata).length === 0 ? undefined : metadata,
      ),
    }
  }
}
