/** @riviere-role value-object */
export class SearchWithFlowOptions {
  declare private readonly brand: 'SearchWithFlowOptions'
  readonly returnAllOnEmptyQuery: boolean

  private constructor(input: { readonly returnAllOnEmptyQuery: boolean }) {
    this.returnAllOnEmptyQuery = input.returnAllOnEmptyQuery
  }

  static parse(input: { readonly returnAllOnEmptyQuery: boolean }): SearchWithFlowOptions {
    return new SearchWithFlowOptions(input)
  }
}
