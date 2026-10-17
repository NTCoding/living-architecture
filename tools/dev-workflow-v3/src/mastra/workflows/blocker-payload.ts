/**
 * @riviere-role workflow-definition
 */
export function questionFrom(payload: unknown): string {
  const question = questionOf(payload)
  return question ?? 'The implementer is waiting for an answer.'
}

function questionOf(payload: unknown): string | undefined {
  if (!isRecord(payload) || !('suspendPayload' in payload)) return undefined
  const inner = payload['suspendPayload']
  if (!isRecord(inner) || !('question' in inner)) return undefined
  const question = inner['question']
  return typeof question === 'string' ? question : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
