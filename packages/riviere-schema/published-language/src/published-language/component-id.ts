type ComponentIdParseResult =
  | { success: true; componentId: ComponentId }
  | { success: false; invalidValue: string; message: string }

/** @riviere-role value-object */
export class ComponentId {
  declare private readonly brand: 'ComponentId'

  private constructor(
    private readonly value: string,
    private readonly componentName: string,
  ) {}

  static parse(value: string): ComponentIdParseResult {
    const parts = value.split(':')
    const componentName = parts[3]
    if (parts.length !== 4 || componentName === undefined || componentName.length === 0) {
      return {
        success: false,
        invalidValue: value,
        message: `Invalid component ID format: '${value}'. Expected 'domain:module:type:name'`,
      }
    }

    return {
      componentId: new ComponentId(value, componentName),
      success: true as const,
    }
  }

  static parseFromParts(parts: {
    domain: string
    module: string
    type: string
    name: string
  }): ComponentId {
    const componentName = parts.name.toLowerCase().replaceAll(/\s+/g, '-')
    return new ComponentId(
      `${parts.domain}:${parts.module}:${parts.type}:${componentName}`,
      componentName,
    )
  }

  toString(): string {
    return this.value
  }

  name(): string {
    return this.componentName
  }
}
