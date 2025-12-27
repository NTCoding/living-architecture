export interface ComponentIdParts {
  domain: string
  module: string
  type: string
  name: string
}

export class ComponentId {
  private readonly _name: string
  private readonly value: string

  private constructor(name: string, value: string) {
    this._name = name
    this.value = value
  }

  static create(parts: ComponentIdParts): ComponentId {
    const nameSegment = parts.name.toLowerCase().replace(/\s+/g, '-')
    const value = `${parts.domain}:${parts.module}:${parts.type}:${nameSegment}`
    return new ComponentId(nameSegment, value)
  }

  static parse(id: string): ComponentId {
    const parts = id.split(':')
    const name = parts[3]
    if (parts.length !== 4 || name === undefined) {
      throw new Error(`Invalid component ID format: '${id}'. Expected 'domain:module:type:name'`)
    }
    return new ComponentId(name, id)
  }

  toString(): string {
    return this.value
  }

  name(): string {
    return this._name
  }
}
