/** @riviere-role value-object */
export class ComponentCounts {
  declare private readonly brand: 'ComponentCounts'
  readonly UI: number
  readonly API: number
  readonly UseCase: number
  readonly DomainOp: number
  readonly Event: number
  readonly EventHandler: number
  readonly Custom: number
  readonly total: number

  private constructor(input: {
    readonly UI: number
    readonly API: number
    readonly UseCase: number
    readonly DomainOp: number
    readonly Event: number
    readonly EventHandler: number
    readonly Custom: number
    readonly total: number
  }) {
    this.UI = input.UI
    this.API = input.API
    this.UseCase = input.UseCase
    this.DomainOp = input.DomainOp
    this.Event = input.Event
    this.EventHandler = input.EventHandler
    this.Custom = input.Custom
    this.total = input.total
  }

  static parse(input: {
    readonly UI: number
    readonly API: number
    readonly UseCase: number
    readonly DomainOp: number
    readonly Event: number
    readonly EventHandler: number
    readonly Custom: number
    readonly total: number
  }): ComponentCounts {
    return new ComponentCounts(input)
  }
}
