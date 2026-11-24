/**
 * @riviere-role domain-event
 *
 * The 3 things a run can wait for.
 *
 * A run suspends in one of its steps when it needs a person. The step name says which
 * question to ask. `wait-for-plan-clarification` stops when the planner needs a decision.
 * `implement` stops when the implementer cannot finish without an answer. `address-feedback`
 * stops when the implementer could not answer every review finding.
 */
export type RunWaiting =
  | { readonly kind: 'plan-question'; readonly question: string | null }
  | { readonly kind: 'implementer-question'; readonly question: string }
  | {
      readonly kind: 'feedback-question'
      readonly reason: string
      readonly unaddressed: readonly number[]
    }

/**
 * @riviere-role domain-service
 *
 * @riviere-role-justification This reads the snapshot of a Mastra run, which is a record of
 * what a step returned rather than the state of an aggregate or a value object. No aggregate
 * owns it, so no method on an object can own this reading either.
 */
export function readRunWaiting(steps: unknown): RunWaiting | null {
  const suspended = suspendedStepOf(steps)
  if (suspended === null) return null
  if (suspended.step === 'wait-for-plan-clarification') {
    return planQuestionOf(suspended.payload)
  }
  if (suspended.step === 'implement') return implementerQuestionOf(suspended.payload)
  if (suspended.step === 'address-feedback') return feedbackQuestionOf(suspended.payload)
  return null
}

type SuspendedStep = {
  readonly step: string
  readonly payload: unknown
}

function suspendedStepOf(steps: unknown): SuspendedStep | null {
  if (!isRecord(steps)) return null
  for (const [step, value] of Object.entries(steps)) {
    const entry: unknown = Array.isArray(value) ? value[0] : value
    if (!isRecord(entry) || entry['status'] !== 'suspended') continue
    return { step, payload: entry['suspendPayload'] }
  }
  return null
}

function planQuestionOf(payload: unknown): RunWaiting | null {
  if (!isRecord(payload)) return null
  const question = payload['question']
  return { kind: 'plan-question', question: typeof question === 'string' ? question : null }
}

function implementerQuestionOf(payload: unknown): RunWaiting | null {
  if (!isRecord(payload)) return null
  const question = payload['question']
  if (typeof question !== 'string' || question === '') return null
  return { kind: 'implementer-question', question }
}

function feedbackQuestionOf(payload: unknown): RunWaiting | null {
  if (!isRecord(payload)) return null
  const reason = payload['reason']
  if (typeof reason !== 'string' || reason === '') return null
  return { kind: 'feedback-question', reason, unaddressed: unaddressedOf(payload) }
}

function unaddressedOf(payload: Record<string, unknown>): readonly number[] {
  const unaddressed = payload['unaddressed']
  if (!Array.isArray(unaddressed)) return []
  return unaddressed.filter((commentId): commentId is number => typeof commentId === 'number')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
