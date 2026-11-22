import type { InboxEvent } from '../planning/inbox-event'

/**
 * @riviere-role domain-port
 *
 * @riviere-role-justification The inbox is the log of what Nick has done that the planning session
 * has not dealt with yet. The server appends to it and the session reads it, so it is a current
 * external fact about a conversation rather than restored aggregate state.
 */
export interface AgentInbox {
  append(event: InboxEvent): void
  since(lastPrinted: number): Promise<readonly InboxEvent[]>
  lastNumber(): Promise<number>
  rememberPrinted(lastPrinted: number): void
  printed(): Promise<number>
}
