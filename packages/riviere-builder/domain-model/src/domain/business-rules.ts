/** @riviere-role value-object */
export class BusinessRules {
  declare private readonly brand: 'BusinessRules'

  private constructor(readonly values: readonly string[]) {}

  static parse(values: readonly string[] | undefined): BusinessRules {
    return new BusinessRules(unique(values ?? []))
  }

  including(incoming: readonly string[] | undefined): BusinessRules {
    if (incoming === undefined || incoming.length === 0) return this
    const combined = unique([...this.values, ...incoming])
    return combined.length === this.values.length ? this : new BusinessRules(combined)
  }
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)]
}
