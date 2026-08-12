/** @riviere-role value-object */
export class AsyncDetectionOptions {
  declare private brand: 'AsyncDetectionOptions'
  readonly strict: boolean
  readonly repository: string

  static parse(params: { strict: boolean; repository: string }): AsyncDetectionOptions {
    return new AsyncDetectionOptions(params)
  }

  private constructor(params: { strict: boolean; repository: string }) {
    this.strict = params.strict
    this.repository = params.repository
  }
}
