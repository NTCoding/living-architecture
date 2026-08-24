import type { EnrichedComponent } from '../../value-extraction/enriched-component'
import type { CallSite } from './call-graph-types'
import type { CallableReference } from './callable-reference'

type ResolvedCallTargetKind = 'component' | 'callable' | 'unresolved' | 'dead-end'

/** @riviere-role value-object */
export class DetectedCall {
  declare private brand: 'DetectedCall'
  readonly source: CallableReference
  readonly receiverTypeName: string | undefined
  readonly calledMethodName: string
  readonly callSite: CallSite
  readonly unresolvedReason: string | undefined

  static parse(params: {
    source: CallableReference
    receiverTypeName?: string
    calledMethodName: string
    callSite: CallSite
    unresolvedReason?: string
  }): DetectedCall {
    return new DetectedCall(params)
  }

  private constructor(params: {
    source: CallableReference
    receiverTypeName?: string
    calledMethodName: string
    callSite: CallSite
    unresolvedReason?: string
  }) {
    this.source = params.source
    this.receiverTypeName = params.receiverTypeName
    this.calledMethodName = params.calledMethodName
    this.callSite = params.callSite
    this.unresolvedReason = params.unresolvedReason
  }
}

/** @riviere-role value-object */
export class ResolvedCallTarget {
  declare private brand: 'ResolvedCallTarget'
  readonly kind: ResolvedCallTargetKind
  readonly call: DetectedCall
  readonly callable: CallableReference | undefined
  readonly component: EnrichedComponent | undefined
  readonly reason: string | undefined

  static parse(params: {
    kind: ResolvedCallTargetKind
    call: DetectedCall
    callable?: CallableReference
    component?: EnrichedComponent
    reason?: string
  }): ResolvedCallTarget {
    return new ResolvedCallTarget(params)
  }

  private constructor(params: {
    kind: ResolvedCallTargetKind
    call: DetectedCall
    callable?: CallableReference
    component?: EnrichedComponent
    reason?: string
  }) {
    this.kind = params.kind
    this.call = params.call
    this.callable = params.callable
    this.component = params.component
    this.reason = params.reason
  }
}
