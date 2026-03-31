import type { ConnectionCallSiteMatch } from '@living-architecture/riviere-extract-config'

/** @riviere-role value-object */
export interface CallSiteInfo {
  methodName: string
  receiverType?: string
}

/** @riviere-role domain-service */
export function matchesCallSiteFilter(
  where: ConnectionCallSiteMatch,
  callSite: CallSiteInfo,
): boolean {
  if (where.methodName !== undefined && where.methodName !== callSite.methodName) {
    return false
  }
  if (where.receiverType !== undefined && where.receiverType !== callSite.receiverType) {
    return false
  }
  return true
}
