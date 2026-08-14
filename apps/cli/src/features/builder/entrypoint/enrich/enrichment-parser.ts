interface ParsedStateTransition {
  from: string
  to: string
}

function parseStateChange(input: string): ParsedStateTransition | undefined {
  const [from, to, ...rest] = input.split(':')
  if (from === undefined || to === undefined || rest.length > 0) return undefined
  return {
    from,
    to,
  }
}

type ParseResult =
  | {
      stateChanges: ParsedStateTransition[]
      success: true
    }
  | {
      invalidInput: string
      success: false
    }

/** @riviere-role entrypoint-cli-input-parser */
export function parseStateChanges(inputs: string[]): ParseResult {
  const stateChanges: ParsedStateTransition[] = []
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
