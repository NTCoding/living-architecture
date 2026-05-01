/** @riviere-role value-object */
export class AsyncDetectionOptions {
  declare private brand: 'AsyncDetectionOptions'
  readonly strict: boolean
  readonly repository: string

  constructor(params: {
    strict: boolean;
    repository: string 
  }) {
    this.strict = params.strict
    this.repository = params.repository
  }
}
