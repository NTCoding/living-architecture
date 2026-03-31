import type { EnrichedComponent } from '../../value-extraction/enrich-components'

/** @riviere-role value-object */
export interface CallGraphOptions {
  strict: boolean
  sourceFilePaths: string[]
  repository: string
}

/** @riviere-role value-object */
export interface CallSite {
  filePath: string
  lineNumber: number
  methodName: string
}

/** @riviere-role value-object */
export interface RawLink {
  source: EnrichedComponent
  target: EnrichedComponent
  callSite: CallSite
}

/** @riviere-role value-object */
export interface UncertainRawLink {
  source: EnrichedComponent
  reason: string
  callSite: CallSite
}

/** @riviere-role domain-service */
export function componentIdentity(component: EnrichedComponent): string {
  return `${component.domain}:${component.type}:${component.name}`
}

/** @riviere-role domain-service */
export function stripGenericArgs(typeName: string): string {
  const index = typeName.indexOf('<')
  if (index === -1) {
    return typeName
  }
  return typeName.slice(0, index)
}
