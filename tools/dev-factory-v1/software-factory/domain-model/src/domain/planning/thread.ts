/** @riviere-role domain-error */
export class InvalidThread extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidThread'
  }
}

type Author = 'nick' | 'agent'

type ThreadMessageFields = {
  readonly author: string
  readonly time: string
  readonly text: string
}

/** @riviere-role domain-event */
export type ThreadMessage = {
  readonly author: Author
  readonly time: string
  readonly text: string
}

type ThreadOutcomeFields = {
  readonly closedBy: string
  readonly time: string
}

/**
 * @riviere-role domain-event
 *
 * Who closed a thread and when. A thread closed by the agent and a thread closed by Nick mean
 * different things when you read a planning document's history, so the file records which.
 */
export type ThreadOutcome = {
  readonly closedBy: Author
  readonly time: string
}

type ThreadFields = {
  readonly id: string
  readonly document: string
  readonly anchor: {
    readonly selectedText: string
    readonly prefix: string
    readonly suffix: string
  }
  readonly messages: readonly ThreadMessageFields[]
  readonly outcome: ThreadOutcomeFields | null
}

const CLOSED = 'nobody'

/**
 * @riviere-role aggregate
 *
 * A conversation about a passage of a planning document. It waits for Nick until he answers, then
 * for the agent until it replies, and it is closed when Nick resolves it.
 */
export class Thread {
  declare private readonly brand: 'Thread'

  private constructor(
    private readonly threadId: string,
    private readonly planningDocument: string,
    private readonly quote: ThreadFields['anchor'],
    private readonly said: readonly ThreadMessage[],
    private readonly closing: ThreadOutcome | null,
  ) {}

  static from(fields: ThreadFields): Thread {
    if (!/^c-\d+$/.test(fields.id)) {
      throw new InvalidThread(`A comment thread id looks like c-1: ${fields.id}`)
    }
    if (fields.anchor.selectedText.trim() === '') {
      throw new InvalidThread(`The thread ${fields.id} has nothing selected to sit beside.`)
    }
    if (fields.messages.length === 0) {
      throw new InvalidThread(`The thread ${fields.id} has no messages.`)
    }
    return new Thread(
      fields.id,
      fields.document,
      fields.anchor,
      fields.messages.map((message) => messageOf(fields.id, message)),
      fields.outcome === null ? null : outcomeOf(fields.id, fields.outcome),
    )
  }

  id(): string {
    return this.threadId
  }

  document(): string {
    return this.planningDocument
  }

  anchor(): ThreadFields['anchor'] {
    return this.quote
  }

  messages(): readonly ThreadMessage[] {
    return this.said
  }

  outcome(): ThreadOutcome | null {
    return this.closing
  }

  waitsFor(): 'nick' | 'agent' | typeof CLOSED {
    if (this.closing !== null) return CLOSED
    const last = this.said.at(-1)
    return last === undefined || last.author === 'nick' ? 'agent' : 'nick'
  }

  replying(message: ThreadMessageFields): Thread {
    if (this.closing !== null) {
      throw new InvalidThread(`The thread ${this.threadId} is closed, so it cannot be replied to.`)
    }
    return new Thread(
      this.threadId,
      this.planningDocument,
      this.quote,
      [...this.said, messageOf(this.threadId, message)],
      null,
    )
  }

  resolved(outcome: ThreadOutcomeFields): Thread {
    if (this.closing !== null) {
      throw new InvalidThread(`The thread ${this.threadId} is already closed.`)
    }
    if (this.waitsFor() === 'agent') {
      throw new InvalidThread(
        `The thread ${this.threadId} waits for the agent, so it cannot be closed yet.`,
      )
    }
    return new Thread(
      this.threadId,
      this.planningDocument,
      this.quote,
      this.said,
      outcomeOf(this.threadId, outcome),
    )
  }
}

function messageOf(threadId: string, fields: ThreadMessageFields): ThreadMessage {
  if (fields.text.trim() === '') {
    throw new InvalidThread(`A message in the thread ${threadId} has no text.`)
  }
  if (fields.time.trim() === '') {
    throw new InvalidThread(`A message in the thread ${threadId} has no time.`)
  }
  const author = authorOf(fields.author)
  if (author === undefined) {
    throw new InvalidThread(`A message in the thread ${threadId} is from ${fields.author}.`)
  }
  return { author, time: fields.time, text: fields.text.trim() }
}

function outcomeOf(threadId: string, fields: ThreadOutcomeFields): ThreadOutcome {
  const closedBy = authorOf(fields.closedBy)
  if (closedBy === undefined) {
    throw new InvalidThread(`The thread ${threadId} was closed by ${fields.closedBy}.`)
  }
  if (fields.time.trim() === '') {
    throw new InvalidThread(`The thread ${threadId} was closed without a time.`)
  }
  return { closedBy, time: fields.time }
}

function authorOf(name: string): Author | undefined {
  return name === 'nick' || name === 'agent' ? name : undefined
}
