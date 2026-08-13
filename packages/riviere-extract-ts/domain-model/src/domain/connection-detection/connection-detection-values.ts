import type {
  EventPublisherConfig,
  HttpLinkConfig,
} from '@living-architecture/riviere-extract-config'
import type { ExternalLink } from '@living-architecture/riviere-schema/schema'
import type { EnrichedComponent } from '../value-extraction/enriched-component'
import type { ExtractedLink } from './extracted-link'

type LinkCollectionParams<TTimings> = {
  links: ExtractedLink[]
  externalLinks: ExternalLink[]
  timings: TTimings
}

function assignLinkCollections<TTimings>(
  target: {
    links: ExtractedLink[]
    externalLinks: ExternalLink[]
    timings: TTimings
  },
  params: LinkCollectionParams<TTimings>,
): void {
  target.links = params.links
  target.externalLinks = params.externalLinks
  target.timings = params.timings
}

/** @riviere-role value-object */
export class ConnectionDetectionOptions {
  declare private brand: 'ConnectionDetectionOptions'
  readonly allowIncomplete: boolean | undefined
  readonly sourceFilePaths: string[]
  readonly eventPublishers: EventPublisherConfig[] | undefined
  readonly httpLinks: HttpLinkConfig[] | undefined
  readonly repository: string

  static parse(params: {
    allowIncomplete?: boolean
    sourceFilePaths: string[]
    eventPublishers?: EventPublisherConfig[]
    httpLinks?: HttpLinkConfig[]
    repository: string
  }): ConnectionDetectionOptions {
    return new ConnectionDetectionOptions(params)
  }

  private constructor(params: {
    allowIncomplete?: boolean
    sourceFilePaths: string[]
    eventPublishers?: EventPublisherConfig[]
    httpLinks?: HttpLinkConfig[]
    repository: string
  }) {
    this.allowIncomplete = params.allowIncomplete
    this.sourceFilePaths = params.sourceFilePaths
    this.eventPublishers = params.eventPublishers
    this.httpLinks = params.httpLinks
    this.repository = params.repository
  }
}

/** @riviere-role value-object */
export class ConnectionTimings {
  declare private brand: 'ConnectionTimings'
  readonly callGraphMs: number
  readonly asyncDetectionMs: number
  readonly setupMs: number
  readonly totalMs: number

  static parse(params: {
    callGraphMs: number
    asyncDetectionMs: number
    setupMs: number
    totalMs: number
  }): ConnectionTimings {
    return new ConnectionTimings(params)
  }

  private constructor(params: {
    callGraphMs: number
    asyncDetectionMs: number
    setupMs: number
    totalMs: number
  }) {
    this.callGraphMs = params.callGraphMs
    this.asyncDetectionMs = params.asyncDetectionMs
    this.setupMs = params.setupMs
    this.totalMs = params.totalMs
  }
}

/** @riviere-role value-object */
export class ConnectionDetectionResult {
  declare private brand: 'ConnectionDetectionResult'
  declare readonly links: ExtractedLink[]
  declare readonly externalLinks: ExternalLink[]
  declare readonly timings: ConnectionTimings

  static parse(params: {
    links: ExtractedLink[]
    externalLinks: ExternalLink[]
    timings: ConnectionTimings
  }): ConnectionDetectionResult {
    return new ConnectionDetectionResult(params)
  }

  private constructor(params: {
    links: ExtractedLink[]
    externalLinks: ExternalLink[]
    timings: ConnectionTimings
  }) {
    assignLinkCollections(this, params)
  }
}

/** @riviere-role value-object */
export class PerModuleConnectionOptions {
  declare private brand: 'PerModuleConnectionOptions'
  readonly allComponents: readonly EnrichedComponent[] | undefined
  readonly allowIncomplete: boolean | undefined
  readonly sourceFilePaths: string[]
  readonly httpLinks: HttpLinkConfig[] | undefined
  readonly repository: string

  static parse(params: {
    allComponents?: readonly EnrichedComponent[]
    allowIncomplete?: boolean
    sourceFilePaths: string[]
    httpLinks?: HttpLinkConfig[]
    repository: string
  }): PerModuleConnectionOptions {
    return new PerModuleConnectionOptions(params)
  }

  private constructor(params: {
    allComponents?: readonly EnrichedComponent[]
    allowIncomplete?: boolean
    sourceFilePaths: string[]
    httpLinks?: HttpLinkConfig[]
    repository: string
  }) {
    this.allComponents = params.allComponents
    this.allowIncomplete = params.allowIncomplete
    this.sourceFilePaths = params.sourceFilePaths
    this.httpLinks = params.httpLinks
    this.repository = params.repository
  }
}

/** @riviere-role value-object */
export class PerModuleTimings {
  declare private brand: 'PerModuleTimings'
  readonly callGraphMs: number
  readonly setupMs: number

  static parse(params: { callGraphMs: number; setupMs: number }): PerModuleTimings {
    return new PerModuleTimings(params)
  }

  private constructor(params: { callGraphMs: number; setupMs: number }) {
    this.callGraphMs = params.callGraphMs
    this.setupMs = params.setupMs
  }
}

/** @riviere-role value-object */
export class PerModuleDetectionResult {
  declare private brand: 'PerModuleDetectionResult'
  declare readonly links: ExtractedLink[]
  declare readonly externalLinks: ExternalLink[]
  declare readonly timings: PerModuleTimings

  static parse(params: {
    links: ExtractedLink[]
    externalLinks: ExternalLink[]
    timings: PerModuleTimings
  }): PerModuleDetectionResult {
    return new PerModuleDetectionResult(params)
  }

  private constructor(params: {
    links: ExtractedLink[]
    externalLinks: ExternalLink[]
    timings: PerModuleTimings
  }) {
    assignLinkCollections(this, params)
  }
}

/** @riviere-role value-object */
export class CrossModuleConnectionOptions {
  declare private brand: 'CrossModuleConnectionOptions'
  readonly allowIncomplete: boolean | undefined
  readonly eventPublishers: EventPublisherConfig[] | undefined
  readonly repository: string

  static parse(params: {
    allowIncomplete?: boolean
    eventPublishers?: EventPublisherConfig[]
    repository: string
  }): CrossModuleConnectionOptions {
    return new CrossModuleConnectionOptions(params)
  }

  private constructor(params: {
    allowIncomplete?: boolean
    eventPublishers?: EventPublisherConfig[]
    repository: string
  }) {
    this.allowIncomplete = params.allowIncomplete
    this.eventPublishers = params.eventPublishers
    this.repository = params.repository
  }
}

/** @riviere-role value-object */
export class CrossModuleTimings {
  declare private brand: 'CrossModuleTimings'
  readonly asyncDetectionMs: number

  static parse(params: { asyncDetectionMs: number }): CrossModuleTimings {
    return new CrossModuleTimings(params)
  }

  private constructor(params: { asyncDetectionMs: number }) {
    this.asyncDetectionMs = params.asyncDetectionMs
  }
}

/** @riviere-role value-object */
export class CrossModuleDetectionResult {
  declare private brand: 'CrossModuleDetectionResult'
  readonly links: ExtractedLink[]
  readonly timings: CrossModuleTimings

  static parse(params: {
    links: ExtractedLink[]
    timings: CrossModuleTimings
  }): CrossModuleDetectionResult {
    return new CrossModuleDetectionResult(params)
  }

  private constructor(params: { links: ExtractedLink[]; timings: CrossModuleTimings }) {
    this.links = params.links
    this.timings = params.timings
  }
}
