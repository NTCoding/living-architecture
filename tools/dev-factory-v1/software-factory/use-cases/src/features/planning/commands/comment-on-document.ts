import { AgentInbox } from '@dev-factory-v1/domain-model/domain/planning/inbox/agent-inbox'
import type { InboxLog } from '@dev-factory-v1/domain-model/domain/ports/inbox-log'
import { Thread } from '@dev-factory-v1/domain-model/domain/planning/thread'
import type { ThreadIdsLoader } from '../data-access/thread/thread-ids-loader'
import type { ThreadRepository } from '../data-access/thread/thread-repository'

/** @riviere-role command-use-case-result-value */
export interface CommentAnchor {
  readonly selectedText: string
  readonly prefix: string
  readonly suffix: string
  readonly firstLine: number
  readonly occurrence: number
}

/** @riviere-role command-use-case-input */
export interface CommentOnDocumentInput {
  readonly epic: string
  readonly document: string
  readonly anchor: CommentAnchor
  readonly text: string
}

/** @riviere-role command-use-case-result */
export interface CommentOnDocumentResult {
  readonly thread: string
  readonly waitsFor: string
}

/**
 * @riviere-role command-use-case
 *
 * Opens a thread on a passage of a planning document and tells the planning agent that it has a
 * comment to answer. The thread's id is the next free `c-<n>` in the epic's folder.
 */
export class CommentOnDocument {
  constructor(
    private readonly threads: ThreadRepository,
    private readonly threadIds: ThreadIdsLoader,
    private readonly log: InboxLog,
    private readonly now: () => string,
  ) {}

  execute(input: CommentOnDocumentInput): CommentOnDocumentResult {
    const time = this.now()
    const inbox = new AgentInbox(this.log)
    const thread = Thread.from({
      id: nextThreadIdOf(this.threadIds.load(input.epic).ids),
      document: input.document,
      anchor: input.anchor,
      messages: [{ author: 'nick', time, text: input.text }],
      outcome: null,
    })
    this.threads.save(input.epic, thread)
    inbox.append({
      kind: 'comment',
      number: inbox.lastNumber() + 1,
      time,
      epic: input.epic,
      item: thread.id(),
    })
    return { thread: thread.id(), waitsFor: thread.waitsFor() }
  }
}

function nextThreadIdOf(ids: readonly string[]): string {
  const numbers = ids.filter((id) => /^c-\d+$/.test(id)).map((id) => Number(id.slice(2)))
  const highest = numbers.length === 0 ? 0 : Math.max(...numbers)
  return `c-${String(highest + 1)}`
}
