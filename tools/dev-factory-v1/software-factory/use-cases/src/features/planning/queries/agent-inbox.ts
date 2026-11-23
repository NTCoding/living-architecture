import { AgentInbox } from '@dev-factory-v1/domain-model/domain/planning/inbox/agent-inbox'
import type { InboxEvent } from '@dev-factory-v1/domain-model/domain/planning/inbox/inbox-event'
import type { InboxLog } from '@dev-factory-v1/domain-model/domain/ports/inbox-log'

/** @riviere-role query-model-use-case-input */
export interface ReadAgentInboxInput {
  readonly lastPrinted: number
}

/** @riviere-role query-model */
export interface AgentInboxItems {
  readonly events: readonly InboxEvent[]
  readonly lastNumber: number
}

/**
 * @riviere-role query-model-use-case
 *
 * The events the planning session has not printed yet, and the number to print next. `inbox --all`
 * reads every event from 0 rather than from the cursor, because an item stays open until the agent
 * replies or closes it.
 */
export class ReadAgentInbox {
  constructor(private readonly log: InboxLog) {}

  execute(input: ReadAgentInboxInput): AgentInboxItems {
    const events = new AgentInbox(this.log).eventsSince(input.lastPrinted)
    return { events, lastNumber: events.at(-1)?.number ?? input.lastPrinted }
  }
}
