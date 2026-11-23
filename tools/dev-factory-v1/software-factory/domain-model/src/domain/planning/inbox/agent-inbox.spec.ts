import { describe, expect, it } from 'vitest'
import type { InboxLog } from '../../ports/inbox-log'
import { AgentInbox, InvalidInboxLine } from './agent-inbox'
import type { InboxEvent } from './inbox-event'

class FakeInboxLog implements InboxLog {
  readonly lines: string[] = []
  printed = 0

  appendLine(line: string): void {
    this.lines.push(line)
  }

  readLines(): readonly string[] {
    return this.lines
  }

  printedNumber(): number {
    return this.printed
  }

  rememberPrinted(number: number): void {
    this.printed = number
  }
}

function inboxOf(...lines: readonly string[]): { inbox: AgentInbox; log: FakeInboxLog } {
  const log = new FakeInboxLog()
  for (const line of lines) log.lines.push(line)
  return { inbox: new AgentInbox(log), log }
}

const commentLine =
  '{"n":41,"time":"2026-11-26T10:02:11Z","kind":"comment","epic":"phase-14","item":"c-3"}'
const decisionLine =
  '{"n":42,"time":"2026-11-26T10:03:05Z","kind":"decision","epic":"phase-14","item":"d-2"}'

describe('AgentInbox', () => {
  it('writes an event as one line', () => {
    const { inbox, log } = inboxOf()
    const event: InboxEvent = {
      kind: 'step-approved',
      number: 43,
      time: '2026-11-26T10:09:30Z',
      epic: 'phase-14',
      step: 'architecture',
    }

    inbox.append(event)

    expect(log.lines).toStrictEqual([JSON.stringify(event)])
  })

  it('reads the events after the number it is given', () => {
    const { inbox } = inboxOf(commentLine, decisionLine, '')

    expect(inbox.eventsSince(41)).toStrictEqual([
      {
        kind: 'decision',
        number: 42,
        time: '2026-11-26T10:03:05Z',
        epic: 'phase-14',
        item: 'd-2',
      },
    ])
  })

  it('reads every kind of event', () => {
    const { inbox } = inboxOf(
      '{"n":1,"time":"t1","kind":"planning-started","epic":"e"}',
      '{"n":2,"time":"t2","kind":"reply","epic":"e","item":"c-1","text":"Yes"}',
      '{"n":3,"time":"t3","kind":"step-approved","epic":"e","step":"architecture"}',
      '{"n":4,"time":"t4","kind":"sent-back","epic":"e","from":"architecture","to":"prd","reason":"Redo it"}',
    )

    expect(inbox.eventsSince(0).map((event) => event.kind)).toStrictEqual([
      'planning-started',
      'reply',
      'step-approved',
      'sent-back',
    ])
    expect(inbox.eventsSince(0)[3]).toStrictEqual({
      kind: 'sent-back',
      number: 4,
      time: 't4',
      epic: 'e',
      from: 'architecture',
      to: 'prd',
      reason: 'Redo it',
    })
  })

  it('says the number of the newest event', () => {
    const { inbox } = inboxOf(commentLine, decisionLine)

    expect(inbox.lastNumber()).toBe(42)
  })

  it('says 0 when no event has been written', () => {
    const { inbox } = inboxOf()

    expect(inbox.lastNumber()).toBe(0)
  })

  it('reads and writes the cursor of the planning session', () => {
    const { inbox } = inboxOf()

    inbox.rememberPrinted(42)

    expect(inbox.printed()).toBe(42)
  })

  it('refuses a line that is not a JSON object', () => {
    const { inbox } = inboxOf('[1,2]')

    expect(() => inbox.eventsSince(0)).toThrow(
      new InvalidInboxLine('An inbox line is a JSON object: [1,2]'),
    )
  })

  it('refuses a line that is not JSON', () => {
    const { inbox } = inboxOf('nope')

    expect(() => inbox.eventsSince(0)).toThrow(SyntaxError)
  })

  it('refuses an event with no number', () => {
    const { inbox } = inboxOf('{"time":"t1","kind":"planning-started","epic":"e"}')

    expect(() => inbox.eventsSince(0)).toThrow(
      new InvalidInboxLine('An inbox event has a whole number in n: undefined'),
    )
  })

  it('refuses an event with no epic', () => {
    const { inbox } = inboxOf('{"n":1,"time":"t1","kind":"planning-started"}')

    expect(() => inbox.eventsSince(0)).toThrow(
      new InvalidInboxLine('An inbox event has text in epic: undefined'),
    )
  })

  it('refuses an event with a kind the factory does not know', () => {
    const { inbox } = inboxOf('{"n":1,"time":"t1","kind":"approved","epic":"e"}')

    expect(() => inbox.eventsSince(0)).toThrow(
      new InvalidInboxLine('An inbox line has a kind the factory knows: approved'),
    )
  })
})
