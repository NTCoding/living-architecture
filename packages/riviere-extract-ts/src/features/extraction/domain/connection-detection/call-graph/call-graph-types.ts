import type { EnrichedComponent } from '../../value-extraction/enrich-components'

export interface CallGraphOptions {
  strict: boolean
  sourceFilePaths: string[]
  repository: string
}

export interface CallSite {
  filePath: string
  lineNumber: number
  methodName: string
}

export interface RawLink {
  source: EnrichedComponent
  target: EnrichedComponent
  callSite: CallSite
}

export interface UncertainRawLink {
  source: EnrichedComponent
  reason: string
  callSite: CallSite
}

export function componentIdentity(component: EnrichedComponent): string {
  return `${component.domain}:${component.type}:${component.name}`
}

export function stripGenericArgs(typeName: string): string {
  const index = typeName.indexOf('<')
  if (index === -1) {
    return typeName
  }
  return typeName.slice(0, index)
}
