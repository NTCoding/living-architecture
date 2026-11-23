import { DecisionAnswer } from './decision-answer'

/** @riviere-role domain-error */
export class InvalidDecision extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidDecision'
  }
}

/**
 * @riviere-role domain-event
 *
 * Who closed a decision and when. A decision is closed by the agent once it has done what the
 * answer asked for, so the file records that it happened rather than only that it did.
 */
export type DecisionOutcome = {
  readonly closedBy: 'agent'
  readonly time: string
}

type DecisionAnswerFields = {
  readonly choice: string
  readonly chosen: string
  readonly reply: string | null
  readonly time: string
}

type DecisionFields = {
  readonly id: string
  readonly document: string
  readonly question: string
  readonly answer: DecisionAnswerFields | null
  readonly followed: boolean
  readonly outcome: DecisionOutcome | null
}

/**
 * @riviere-role aggregate
 *
 * A question the planning agent asked in a planning document, with your answer to it and whether
 * the agent has done what the answer asked for. It takes one answer and it is closed only once the
 * agent has followed that answer, because closing it before then loses the work it asked for.
 */
export class Decision {
  declare private readonly brand: 'Decision'

  private constructor(
    private readonly decisionId: string,
    private readonly planningDocument: string,
    private readonly asked: string,
    private readonly given: DecisionAnswer | null,
    private readonly done: boolean,
    private readonly closing: DecisionOutcome | null,
  ) {}

  static from(fields: DecisionFields): Decision {
    if (!/^d-\d+$/.test(fields.id)) {
      throw new InvalidDecision(`A decision id looks like d-1: ${fields.id}`)
    }
    if (fields.question.trim() === '') {
      throw new InvalidDecision(`The decision ${fields.id} has no question.`)
    }
    return new Decision(
      fields.id,
      fields.document,
      fields.question.trim(),
      fields.answer === null ? null : DecisionAnswer.from(fields.answer),
      fields.followed,
      fields.outcome === null ? null : outcomeOf(fields.id, fields.outcome),
    )
  }

  id(): string {
    return this.decisionId
  }

  document(): string {
    return this.planningDocument
  }

  question(): string {
    return this.asked
  }

  answer(): DecisionAnswer | null {
    return this.given
  }

  isFollowed(): boolean {
    return this.done
  }

  outcome(): DecisionOutcome | null {
    return this.closing
  }

  waitsFor(): 'nick' | 'agent' | 'nobody' {
    if (this.closing !== null) return 'nobody'
    return this.given === null ? 'nick' : 'agent'
  }

  answered(fields: DecisionAnswerFields): Decision {
    if (this.given !== null) {
      throw new InvalidDecision(`The decision ${this.decisionId} has already been answered.`)
    }
    return new Decision(
      this.decisionId,
      this.planningDocument,
      this.asked,
      DecisionAnswer.from(fields),
      this.done,
      this.closing,
    )
  }

  followed(time: string): Decision {
    if (this.given === null) {
      throw new InvalidDecision(
        `The decision ${this.decisionId} has no answer, so the agent cannot follow it.`,
      )
    }
    if (this.closing !== null) {
      throw new InvalidDecision(`The decision ${this.decisionId} is already closed.`)
    }
    if (time.trim() === '') {
      throw new InvalidDecision(`The decision ${this.decisionId} was followed without a time.`)
    }
    return new Decision(this.decisionId, this.planningDocument, this.asked, this.given, true, {
      closedBy: 'agent',
      time,
    })
  }
}

function outcomeOf(decisionId: string, fields: DecisionOutcome): DecisionOutcome {
  if (fields.time.trim() === '') {
    throw new InvalidDecision(`The decision ${decisionId} was closed without a time.`)
  }
  return { closedBy: 'agent', time: fields.time }
}
