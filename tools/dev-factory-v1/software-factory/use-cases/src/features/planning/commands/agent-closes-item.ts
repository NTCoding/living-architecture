import type { DecisionRepository } from '../data-access/decision/decision-repository'
import type { ThreadRepository } from '../data-access/thread/thread-repository'

/** @riviere-role command-use-case-input */
export interface AgentClosesItemInput {
  readonly epic: string
  readonly item: string
}

/** @riviere-role command-use-case-result */
export interface AgentClosesItemResult {
  readonly item: string
  readonly closedBy: string
}

/**
 * @riviere-role command-use-case
 *
 * Closes the item the planning agent has just dealt with. An answered decision is closed once the
 * agent has done what the answer asked for, and a thread is closed when the agent has nothing left
 * to add.
 *
 * The item's id says which of the 2 files it is, because they share one folder.
 */
export class AgentClosesItem {
  constructor(
    private readonly decisions: DecisionRepository,
    private readonly threads: ThreadRepository,
    private readonly now: () => string,
  ) {}

  execute(input: AgentClosesItemInput): AgentClosesItemResult {
    const time = this.now()
    if (input.item.startsWith('d-')) {
      this.decisions.save(input.epic, this.decisions.load(input.epic, input.item).followed(time))
      return { item: input.item, closedBy: 'agent' }
    }
    const closed = this.threads.load(input.epic, input.item).resolved({ closedBy: 'agent', time })
    this.threads.save(input.epic, closed)
    return { item: input.item, closedBy: 'agent' }
  }
}
