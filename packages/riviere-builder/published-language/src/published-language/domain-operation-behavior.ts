import type { OperationBehavior } from '@living-architecture/riviere-schema-published-language/schema'

/** @riviere-role value-object */
export class DomainOperationBehavior {
  declare private readonly brand: 'DomainOperationBehavior'

  private constructor(readonly value: OperationBehavior) {}

  static parse(value: OperationBehavior | undefined): DomainOperationBehavior {
    return new DomainOperationBehavior(normalized(value))
  }

  including(incoming: OperationBehavior | undefined): DomainOperationBehavior {
    if (incoming === undefined) return this
    const reads = combine(this.value.reads, incoming.reads)
    const validates = combine(this.value.validates, incoming.validates)
    const modifies = combine(this.value.modifies, incoming.modifies)
    const emits = combine(this.value.emits, incoming.emits)
    const combined = normalized({
      ...(reads === undefined ? {} : { reads }),
      ...(validates === undefined ? {} : { validates }),
      ...(modifies === undefined ? {} : { modifies }),
      ...(emits === undefined ? {} : { emits }),
    })
    return new DomainOperationBehavior(combined)
  }
}

function normalized(value: OperationBehavior | undefined): OperationBehavior {
  if (value === undefined) return {}
  return {
    ...(value.reads === undefined ? {} : { reads: unique(value.reads) }),
    ...(value.validates === undefined ? {} : { validates: unique(value.validates) }),
    ...(value.modifies === undefined ? {} : { modifies: unique(value.modifies) }),
    ...(value.emits === undefined ? {} : { emits: unique(value.emits) }),
  }
}

function combine(
  existing: readonly string[] | undefined,
  incoming: readonly string[] | undefined,
): string[] | undefined {
  if (existing === undefined && incoming === undefined) return undefined
  return unique([...(existing ?? []), ...(incoming ?? [])])
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)]
}
