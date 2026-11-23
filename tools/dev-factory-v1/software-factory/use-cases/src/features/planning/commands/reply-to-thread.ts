import type { AgentInbox } from '@dev-factory-v1/domain-model/domain/planning/inbox/agent-inbox'
import type { ThreadRepository } from '../data-access/thread/thread-repository'

/** @riviere-role command-use-case-input */
export interface ReplyToThreadInput {
  readonly epic: string
  readonly thread: string
  readonly text: string
}

/** @riviere-role command-use-case-result */
export interface ReplyToThreadResult {
  readonly thread: string
  readonly waitsFor: string
}

/**
 * @riviere-role command-use-case
 *
 * Adds your reply to a comment thread and tells the planning agent that it has something to answer.
 * Any other reply in the thread would land in the same place, so the agent's answer arrives through
 * the command in `agent-replies.ts`.
 */
export class ReplyToThread {
  constructor(
    private readonly threads: ThreadRepository,
    private readonly inbox: AgentInbox,
    private readonly now: () => string,
  ) {}

  execute(input: ReplyToThreadInput): ReplyToThreadResult {
    const time = this.now()
    const replied = this.threads
      .load(input.epic, input.thread)
      .replying({ author: 'nick', time, text: input.text })
    this.threads.save(input.epic, replied)
    this.inbox.append({
      kind: 'reply',
      number: this.inbox.lastNumber() + 1,
      time,
      epic: input.epic,
      item: input.thread,
      text: input.text,
    })
    return { thread: replied.id(), waitsFor: replied.waitsFor() }
  }
}
