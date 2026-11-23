import { describe, expect, it } from 'vitest'
import { AgentInbox } from '@dev-factory-v1/domain-model/domain/planning/inbox/agent-inbox'
import type { InboxLog } from '@dev-factory-v1/domain-model/domain/ports/inbox-log'
import { ReadAgentInbox } from './agent-inbox'

class FakeInboxLog implements InboxLog {
  constructor(private readonly lines: readonly string[]) {}

  appendLine(): void {
    // The query only reads.
  }

  readLines(): readonly string[] {
    return this.lines
  }

  printedNumber(): number {
    return 0
  }

  rememberPrinted(): void {
    // The query only reads.
  }
}

const lines = [
  '{"n":41,"time":"t1","kind":"comment","epic":"e","item":"c-3"}',
  '{"n":42,"time":"t2","kind":"decision","epic":"e","item":"d-2"}',
]

describe('ReadAgentInbox', () => {
  it('reads the events after the number the session printed', () => {
    const inbox = new ReadAgentInbox(new AgentInbox(new FakeInboxLog(lines)))

    const items = inbox.execute({ lastPrinted: 41 })

    expect(items.events.map((event) => event.number)).toStrictEqual([42])
    expect(items.lastNumber).toBe(42)
  })

  it('reads every event when nothing has been printed', () => {
    const inbox = new ReadAgentInbox(new AgentInbox(new FakeInboxLog(lines)))

    expect(inbox.execute({ lastPrinted: 0 }).events).toHaveLength(2)
  })

  it('says the number it was given when there is nothing new', () => {
    const inbox = new ReadAgentInbox(new AgentInbox(new FakeInboxLog([])))

    expect(inbox.execute({ lastPrinted: 41 })).toStrictEqual({ events: [], lastNumber: 41 })
  })
})
