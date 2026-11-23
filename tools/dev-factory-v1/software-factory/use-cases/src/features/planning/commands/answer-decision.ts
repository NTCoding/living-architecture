import type { AgentInbox } from '@dev-factory-v1/domain-model/domain/planning/inbox/agent-inbox'
import type { DecisionRepository } from '../data-access/decision/decision-repository'

/** @riviere-role command-use-case-input */
export interface AnswerDecisionInput {
  readonly epic: string
  readonly decision: string
  readonly choice: string
  readonly chosen: string
  readonly reply: string | null
}

/** @riviere-role command-use-case-result */
export interface AnswerDecisionResult {
  readonly decision: string
  readonly waitsFor: string
}

/**
 * @riviere-role command-use-case
 *
 * Records your answer to a `:::decision` block and tells the planning agent to do what the answer
 * asked for.
 */
export class AnswerDecision {
  constructor(
    private readonly decisions: DecisionRepository,
    private readonly inbox: AgentInbox,
    private readonly now: () => string,
  ) {}

  execute(input: AnswerDecisionInput): AnswerDecisionResult {
    const time = this.now()
    const answered = this.decisions.load(input.epic, input.decision).answered({
      choice: input.choice,
      chosen: input.chosen,
      reply: input.reply,
      time,
    })
    this.decisions.save(input.epic, answered)
    this.inbox.append({
      kind: 'decision',
      number: this.inbox.lastNumber() + 1,
      time,
      epic: input.epic,
      item: input.decision,
    })
    return { decision: answered.id(), waitsFor: answered.waitsFor() }
  }
}
