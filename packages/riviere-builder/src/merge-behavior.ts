import type { DomainOpComponent, OperationBehavior } from '@living-architecture/riviere-schema'
import { deduplicateStrings } from './deduplicate'

function mergeStringArray(existing: string[] | undefined, incoming: string[]): string[] {
  const base = existing ?? []
  return [...base, ...deduplicateStrings(base, incoming)]
}

export function mergeBehavior(
  existing: DomainOpComponent['behavior'],
  incoming: OperationBehavior
): OperationBehavior {
  const base = existing ?? {}
  return {
    ...base,
    ...(incoming.reads !== undefined && { reads: mergeStringArray(base.reads, incoming.reads) }),
    ...(incoming.validates !== undefined && { validates: mergeStringArray(base.validates, incoming.validates) }),
    ...(incoming.modifies !== undefined && { modifies: mergeStringArray(base.modifies, incoming.modifies) }),
    ...(incoming.emits !== undefined && { emits: mergeStringArray(base.emits, incoming.emits) }),
  }
}
