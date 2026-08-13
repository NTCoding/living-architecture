/** @riviere-role value-object */
export class DiffStats {
  declare private readonly brand: 'DiffStats'
  readonly componentsAdded: number
  readonly componentsRemoved: number
  readonly componentsModified: number
  readonly linksAdded: number
  readonly linksRemoved: number

  private constructor(input: {
    readonly componentsAdded: number
    readonly componentsRemoved: number
    readonly componentsModified: number
    readonly linksAdded: number
    readonly linksRemoved: number
  }) {
    this.componentsAdded = input.componentsAdded
    this.componentsRemoved = input.componentsRemoved
    this.componentsModified = input.componentsModified
    this.linksAdded = input.linksAdded
    this.linksRemoved = input.linksRemoved
  }

  static parse(input: {
    readonly componentsAdded: number
    readonly componentsRemoved: number
    readonly componentsModified: number
    readonly linksAdded: number
    readonly linksRemoved: number
  }): DiffStats {
    return new DiffStats(input)
  }
}
