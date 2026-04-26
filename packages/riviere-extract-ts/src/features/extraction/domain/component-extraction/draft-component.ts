/** @riviere-role value-object */
export class DraftComponent {
  declare private brand: 'DraftComponent'
  readonly type: string
  readonly name: string
  readonly location: {
    file: string
    line: number
  }
  readonly domain: string
  readonly module: string

  constructor(params: {
    type: string
    name: string
    location: {
      file: string
      line: number
    }
    domain: string
    module: string
  }) {
    this.type = params.type
    this.name = params.name
    this.location = params.location
    this.domain = params.domain
    this.module = params.module
  }
}
