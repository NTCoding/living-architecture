import type { StateTransition } from '@living-architecture/riviere-schema'

function parseStateChange(input: string): StateTransition | undefined {
  const [from, to, ...rest] = input.split(':')
  if (from === undefined || to === undefined || rest.length > 0) return undefined
  return {
    from,
    to,
  }
}

type ParseResult =
  | {
    stateChanges: StateTransition[]
    success: true
  }
  | {
    invalidInput: string
    success: false
  }

/** @riviere-role cli-input-validator */
export function parseStateChanges(inputs: string[]): ParseResult {
  const stateChanges: StateTransition[] = []
  for (const sc of inputs) {
    const parsed = parseStateChange(sc)
    if (parsed === undefined)
      return {
        invalidInput: sc,
        success: false,
      }
    stateChanges.push(parsed)
  }
  return {
    stateChanges,
    success: true,
  }
}
