import type { DomainOpComponent, OperationBehavior } from '@living-architecture/riviere-schema'

export function mergeBehavior(
  existing: DomainOpComponent['behavior'],
  incoming: OperationBehavior
): OperationBehavior {
  const base = existing ?? {}
  return {
    ...base,
    ...(incoming.reads !== undefined && {
      reads: [...(base.reads ?? []), ...incoming.reads],
    }),
    ...(incoming.validates !== undefined && {
      validates: [...(base.validates ?? []), ...incoming.validates],
    }),
    ...(incoming.modifies !== undefined && {
      modifies: [...(base.modifies ?? []), ...incoming.modifies],
    }),
    ...(incoming.emits !== undefined && {
      emits: [...(base.emits ?? []), ...incoming.emits],
    }),
  }
}
