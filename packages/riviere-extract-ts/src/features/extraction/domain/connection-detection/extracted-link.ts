import type { Link } from '@living-architecture/riviere-schema'

/** @riviere-role value-object */
export class ExtractedLink {
  declare private brand: 'ExtractedLink'
  readonly source: string
  readonly target: string
  readonly type: 'sync' | 'async' | undefined
  readonly _uncertain: string | undefined
  readonly sourceLocation: Link['sourceLocation'] | undefined

  constructor(params: {
    source: string
    target: string
    type?: 'sync' | 'async'
    _uncertain?: string
    sourceLocation?: Link['sourceLocation']
  }) {
    this.source = params.source
    this.target = params.target
    this.type = params.type
    this._uncertain = params._uncertain
    this.sourceLocation = params.sourceLocation
  }
}
