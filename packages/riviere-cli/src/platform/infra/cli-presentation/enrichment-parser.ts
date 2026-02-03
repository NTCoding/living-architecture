import type { StateTransition } from '@living-architecture/riviere-schema'

function parseStateChange(input: string): StateTransition | undefined {
  const [from, to, ...rest] = input.split(':')
  if (from === undefined || to === undefined || rest.length > 0) {
    return undefined
  }
  return {
    from,
    to,
  }
}

type ParseResult =
  | {
    success: true
    stateChanges: StateTransition[]
  }
  | {
    success: false
    invalidInput: string
  }

export function parseStateChanges(inputs: string[]): ParseResult {
  const stateChanges: StateTransition[] = []
  for (const sc of inputs) {
    const parsed = parseStateChange(sc)
    if (parsed === undefined) {
      return {
        success: false,
        invalidInput: sc,
      }
    }
    stateChanges.push(parsed)
  }
  return {
    success: true,
    stateChanges,
  }
}

interface BehaviorOptions {
  reads: string[]
  validates: string[]
  modifies: string[]
  emits: string[]
}

export function buildBehavior(
  options: BehaviorOptions,
): { behavior: object } | Record<string, never> {
  const hasBehavior =
    options.reads.length > 0 ||
    options.validates.length > 0 ||
    options.modifies.length > 0 ||
    options.emits.length > 0

  if (!hasBehavior) {
    return {}
  }

  return {
    behavior: {
      ...(options.reads.length > 0 && { reads: options.reads }),
      ...(options.validates.length > 0 && { validates: options.validates }),
      ...(options.modifies.length > 0 && { modifies: options.modifies }),
      ...(options.emits.length > 0 && { emits: options.emits }),
    },
  }
}
