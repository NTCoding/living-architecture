import { ComponentId } from './component-id'

/** @riviere-role value-object */
export class SearchWithFlowResult {
  declare private readonly brand: 'SearchWithFlowResult'
  readonly matchingIds: ComponentId[]
  readonly visibleIds: ComponentId[]

  private constructor(input: {
    readonly matchingIds: ComponentId[]
    readonly visibleIds: ComponentId[]
  }) {
    this.matchingIds = input.matchingIds
    this.visibleIds = input.visibleIds
  }

  static parse(input: {
    readonly matchingIds: ComponentId[]
    readonly visibleIds: ComponentId[]
  }): SearchWithFlowResult {
    return new SearchWithFlowResult(input)
  }
}
