import type { EnrichedComponent } from '../../value-extraction/enriched-component'

/** @riviere-role value-object */
export class CallGraphOptions {
  declare private brand: 'CallGraphOptions'
  readonly strict: boolean
  readonly sourceFilePaths: string[]
  readonly repository: string

  static parse(params: {
    strict: boolean
    sourceFilePaths: string[]
    repository: string
  }): CallGraphOptions {
    return new CallGraphOptions(params)
  }

  private constructor(params: { strict: boolean; sourceFilePaths: string[]; repository: string }) {
    this.strict = params.strict
    this.sourceFilePaths = params.sourceFilePaths
    this.repository = params.repository
  }
}

/** @riviere-role value-object */
export class CallSite {
  declare private brand: 'CallSite'
  readonly filePath: string
  readonly lineNumber: number
  readonly methodName: string

  static parse(params: { filePath: string; lineNumber: number; methodName: string }): CallSite {
    return new CallSite(params)
  }

  private constructor(params: { filePath: string; lineNumber: number; methodName: string }) {
    this.filePath = params.filePath
    this.lineNumber = params.lineNumber
    this.methodName = params.methodName
  }
}

/** @riviere-role value-object */
export class RawLink {
  declare private brand: 'RawLink'
  readonly source: EnrichedComponent
  readonly target: EnrichedComponent
  readonly callSite: CallSite

  static parse(params: {
    source: EnrichedComponent
    target: EnrichedComponent
    callSite: CallSite
  }): RawLink {
    return new RawLink(params)
  }

  private constructor(params: {
    source: EnrichedComponent
    target: EnrichedComponent
    callSite: CallSite
  }) {
    this.source = params.source
    this.target = params.target
    this.callSite = params.callSite
  }
}

/** @riviere-role value-object */
export class UncertainRawLink {
  declare private brand: 'UncertainRawLink'
  readonly source: EnrichedComponent
  readonly reason: string
  readonly callSite: CallSite

  static parse(params: {
    source: EnrichedComponent
    reason: string
    callSite: CallSite
  }): UncertainRawLink {
    return new UncertainRawLink(params)
  }

  private constructor(params: { source: EnrichedComponent; reason: string; callSite: CallSite }) {
    this.source = params.source
    this.reason = params.reason
    this.callSite = params.callSite
  }
}
