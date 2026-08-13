import { ComponentCounts } from './component-counts'

/** @riviere-role value-object */
export class Domain {
  declare private readonly brand: 'Domain'
  readonly name: string
  readonly description: string
  readonly systemType: import('@living-architecture/riviere-schema/schema').SystemType
  readonly componentCounts: ComponentCounts

  private constructor(input: {
    readonly name: string
    readonly description: string
    readonly systemType: import('@living-architecture/riviere-schema/schema').SystemType
    readonly componentCounts: ComponentCounts
  }) {
    this.name = input.name
    this.description = input.description
    this.systemType = input.systemType
    this.componentCounts = input.componentCounts
  }

  static parse(input: {
    readonly name: string
    readonly description: string
    readonly systemType: import('@living-architecture/riviere-schema/schema').SystemType
    readonly componentCounts: ComponentCounts
  }): Domain {
    return new Domain(input)
  }
}
