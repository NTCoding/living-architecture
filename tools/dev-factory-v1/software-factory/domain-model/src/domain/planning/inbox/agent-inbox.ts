import type { InboxLog } from '../../ports/inbox-log'
import type { InboxEvent } from './inbox-event'

/** @riviere-role domain-error */
export class InvalidInboxLine extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidInboxLine'
  }
}

/**
 * @riviere-role domain-service
 *
 * @riviere-role-justification The inbox is an append-only log of what Nick has done since the
 * planning session last looked, rather than the state of one aggregate. Nothing owns it, so the
 * rules that turn an event into a line and a line back into an event belong to a service over the
 * log. Its only collaborator is the port that moves the lines.
 */
export class AgentInbox {
  constructor(private readonly log: InboxLog) {}

  append(event: InboxEvent): void {
    this.log.appendLine(JSON.stringify(lineOf(event)))
  }

  eventsSince(number: number): readonly InboxEvent[] {
    return this.log
      .readLines()
      .filter((line) => line.trim() !== '')
      .map((line) => parseLine(line))
      .filter((event) => event.number > number)
  }

  lastNumber(): number {
    const events = this.eventsSince(0)
    return events.at(-1)?.number ?? 0
  }

  printed(): number {
    return this.log.printedNumber()
  }

  rememberPrinted(number: number): void {
    this.log.rememberPrinted(number)
  }
}

function lineOf(event: InboxEvent): Record<string, unknown> {
  const { number, ...rest } = event
  return { n: number, ...rest }
}

function parseLine(line: string): InboxEvent {
  const value = parseJson(line)
  const number = numberFieldOf(value)
  const time = stringFieldOf(value, 'time')
  const epic = stringFieldOf(value, 'epic')
  switch (value['kind']) {
    case 'planning-started':
      return { kind: 'planning-started', number, time, epic }
    case 'comment':
      return { kind: 'comment', number, time, epic, item: stringFieldOf(value, 'item') }
    case 'decision':
      return { kind: 'decision', number, time, epic, item: stringFieldOf(value, 'item') }
    case 'reply':
      return {
        kind: 'reply',
        number,
        time,
        epic,
        item: stringFieldOf(value, 'item'),
        text: stringFieldOf(value, 'text'),
      }
    case 'step-approved':
      return { kind: 'step-approved', number, time, epic, step: stringFieldOf(value, 'step') }
    case 'sent-back':
      return {
        kind: 'sent-back',
        number,
        time,
        epic,
        from: stringFieldOf(value, 'from'),
        to: stringFieldOf(value, 'to'),
        reason: stringFieldOf(value, 'reason'),
      }
    default:
      throw new InvalidInboxLine(
        `An inbox line has a kind the factory knows: ${String(value['kind'])}`,
      )
  }
}

function parseJson(line: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(line)
  if (!isMapping(parsed)) {
    throw new InvalidInboxLine(`An inbox line is a JSON object: ${line}`)
  }
  return parsed
}

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function numberFieldOf(value: Record<string, unknown>): number {
  const number = value['n']
  if (typeof number !== 'number' || !Number.isInteger(number) || number < 1) {
    throw new InvalidInboxLine(`An inbox event has a whole number in n: ${String(number)}`)
  }
  return number
}

function stringFieldOf(value: Record<string, unknown>, field: string): string {
  const text = value[field]
  if (typeof text !== 'string' || text.trim() === '') {
    throw new InvalidInboxLine(`An inbox event has text in ${field}: ${String(text)}`)
  }
  return text
}
