import type { ThreadRepository } from '../data-access/thread/thread-repository'

/** @riviere-role command-use-case-input */
export interface AgentRepliesInput {
  readonly epic: string
  readonly thread: string
  readonly text: string
}

/** @riviere-role command-use-case-result */
export interface AgentRepliesResult {
  readonly thread: string
  readonly waitsFor: string
}

/**
 * @riviere-role command-use-case
 *
 * Adds the planning agent's reply to one of Nick's comments. The thread then waits for Nick again,
 * because the agent has said what it has to say about the passage he selected.
 */
export class AgentReplies {
  constructor(
    private readonly threads: ThreadRepository,
    private readonly now: () => string,
  ) {}

  execute(input: AgentRepliesInput): AgentRepliesResult {
    const replied = this.threads
      .load(input.epic, input.thread)
      .replying({ author: 'agent', time: this.now(), text: input.text })
    this.threads.save(input.epic, replied)
    return { thread: replied.id(), waitsFor: replied.waitsFor() }
  }
}
