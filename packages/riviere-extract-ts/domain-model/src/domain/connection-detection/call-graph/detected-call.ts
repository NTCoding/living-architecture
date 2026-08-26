import type { EnrichedComponent } from '../../value-extraction/enriched-component'
import type { CallSite } from './call-graph-types'
import type { CallableReference } from './callable-reference'

type ResolvedCallTargetResolution =
  | Readonly<{
      kind: 'component'
      callable: CallableReference
      component: EnrichedComponent
    }>
  | Readonly<{
      kind: 'callable'
      callable: CallableReference
    }>
  | Readonly<{
      kind: 'unresolved'
      reason: string
    }>
  | Readonly<{
      kind: 'dead-end'
    }>

type ResolvedCallTargetParams =
  | Readonly<{
      kind: 'component'
      call: DetectedCall
      callable: CallableReference
      component: EnrichedComponent
    }>
  | Readonly<{
      kind: 'callable'
      call: DetectedCall
      callable: CallableReference
    }>
  | Readonly<{
      kind: 'unresolved'
      call: DetectedCall
      reason: string
    }>
  | Readonly<{
      kind: 'dead-end'
      call: DetectedCall
    }>

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
  declare private readonly brand: 'ResolvedCallTarget'
  readonly call: DetectedCall
  readonly resolution: ResolvedCallTargetResolution

  static parse(params: ResolvedCallTargetParams): ResolvedCallTarget {
    switch (params.kind) {
      case 'component':
        return new ResolvedCallTarget(params.call, {
          kind: params.kind,
          callable: params.callable,
          component: params.component,
        })
      case 'callable':
        return new ResolvedCallTarget(params.call, {
          kind: params.kind,
          callable: params.callable,
        })
      case 'unresolved':
        return new ResolvedCallTarget(params.call, {
          kind: params.kind,
          reason: params.reason,
        })
      case 'dead-end':
        return new ResolvedCallTarget(params.call, { kind: params.kind })
    }
  }

  private constructor(call: DetectedCall, resolution: ResolvedCallTargetResolution) {
    this.call = call
    this.resolution = resolution
  }
}
