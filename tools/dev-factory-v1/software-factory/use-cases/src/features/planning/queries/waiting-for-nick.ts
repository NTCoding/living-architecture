import type { DecisionRepository } from '../data-access/decision/decision-repository'
import type { PlanningFoldersLoader } from '../data-access/planning-folders/planning-folders-loader'
import type { ThreadIdsLoader } from '../data-access/thread/thread-ids-loader'
import type { ThreadRepository } from '../data-access/thread/thread-repository'

/** @riviere-role query-model-use-case-input */
export type ListWaitingForNickInput = Record<string, never>

/** @riviere-role query-model-value */
export interface WaitingItem {
  readonly epic: string
  readonly item: string
  readonly kind: string
  readonly document: string
  readonly question: string | null
  readonly last: string
}

/** @riviere-role query-model */
export interface WaitingForNick {
  readonly items: readonly WaitingItem[]
}

/**
 * @riviere-role query-model-use-case
 *
 * Everything on the planning board that waits for you: a thread whose last message is the agent's,
 * and a decision that nobody has answered. The sidebar reads this to show that there is work for
 * you, and the inbox of the UI lists it.
 */
export class ListWaitingForNick {
  constructor(
    private readonly folders: PlanningFoldersLoader,
    private readonly threadIds: ThreadIdsLoader,
    private readonly threads: ThreadRepository,
    private readonly decisions: DecisionRepository,
  ) {}

  execute(_input: ListWaitingForNickInput): WaitingForNick {
    const items = this.folders
      .load()
      .epics.flatMap((epic) => this.waitingIn(epic))
      .sort((left, right) => left.epic.localeCompare(right.epic))
    return { items }
  }

  private waitingIn(epic: string): readonly WaitingItem[] {
    return this.threadIds
      .load(epic)
      .ids.flatMap((item) =>
        item.startsWith('d-') ? this.waitingDecision(epic, item) : this.waitingThread(epic, item),
      )
  }

  private waitingDecision(epic: string, item: string): readonly WaitingItem[] {
    const decision = this.decisions.load(epic, item)
    if (decision.waitsFor() !== 'nick') return []
    return [
      {
        epic,
        item,
        kind: 'decision',
        document: decision.document(),
        question: decision.question(),
        last: '',
      },
    ]
  }

  private waitingThread(epic: string, item: string): readonly WaitingItem[] {
    const thread = this.threads.load(epic, item)
    if (thread.waitsFor() !== 'nick') return []
    return thread
      .messages()
      .slice(-1)
      .map((message) => ({
        epic,
        item,
        kind: 'comment',
        document: thread.document(),
        question: null,
        last: message.text,
      }))
  }
}
