/**
 * @riviere-role domain-event
 *
 * A run as Mastra reports it: its name, its status, when it started and how each step ended.
 * The factory reads it rather than writes it, and it carries no behaviour of its own.
 */
export type RunSnapshot = {
  readonly runId: string
  readonly status: string
  readonly createdAt: number
  readonly steps: unknown
  readonly result: unknown
  readonly error: unknown
}
