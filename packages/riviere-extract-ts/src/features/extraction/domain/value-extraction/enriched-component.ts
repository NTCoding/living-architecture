import type { DraftComponent } from '../component-extraction/draft-component'

type MetadataValue = string | number | boolean | string[]

/** @riviere-role value-object */
export class EnrichedComponent {
  declare private brand: 'EnrichedComponent'
  readonly type: string
  readonly name: string
  readonly location: {
    file: string
    line: number
  }
  readonly domain: string
  readonly module: string
  readonly metadata: Record<string, MetadataValue>
  _missing: string[] | undefined

  static parse(params: {
    type: string
    name: string
    location: {
      file: string
      line: number
    }
    domain: string
    module: string
    metadata: Record<string, MetadataValue>
    _missing: string[] | undefined
  }): EnrichedComponent {
    return new EnrichedComponent(params)
  }

  private constructor(params: {
    type: string
    name: string
    location: {
      file: string
      line: number
    }
    domain: string
    module: string
    metadata: Record<string, MetadataValue>
    _missing: string[] | undefined
  }) {
    this.type = params.type
    this.name = params.name
    this.location = params.location
    this.domain = params.domain
    this.module = params.module
    this.metadata = params.metadata
    this._missing = params._missing
  }
}

/** @riviere-role value-object */
export class EnrichmentFailure {
  declare private brand: 'EnrichmentFailure'
  readonly component: DraftComponent
  readonly field: string
  readonly error: string

  static parse(params: {
    component: DraftComponent
    field: string
    error: string
  }): EnrichmentFailure {
    return new EnrichmentFailure(params)
  }

  private constructor(params: {
    component: DraftComponent;
    field: string;
    error: string 
  }) {
    this.component = params.component
    this.field = params.field
    this.error = params.error
  }
}

/** @riviere-role value-object */
export class EnrichmentResult {
  declare private brand: 'EnrichmentResult'
  readonly components: EnrichedComponent[]
  readonly failures: EnrichmentFailure[]

  static parse(params: {
    components: EnrichedComponent[]
    failures: EnrichmentFailure[]
  }): EnrichmentResult {
    return new EnrichmentResult(params)
  }

  private constructor(params: {
    components: EnrichedComponent[];
    failures: EnrichmentFailure[] 
  }) {
    this.components = params.components
    this.failures = params.failures
  }
}

export type { MetadataValue }
