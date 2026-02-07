import type { ConnectionCallSiteMatch } from '@living-architecture/riviere-extract-config'

export interface CallSiteInfo {
  methodName: string
  receiverType?: string
}

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
