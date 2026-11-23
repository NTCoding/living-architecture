import type { ThreadRepository } from '../data-access/thread/thread-repository'

/** @riviere-role command-use-case-input */
export interface ResolveThreadInput {
  readonly epic: string
  readonly thread: string
}

/** @riviere-role command-use-case-result */
export interface ResolveThreadResult {
  readonly thread: string
  readonly closedBy: string
}

/**
 * @riviere-role command-use-case
 *
 * Closes a comment thread that has been dealt with. Nothing is added to the inbox, because a closed
 * thread asks nothing of the planning agent.
 */
export class ResolveThread {
  constructor(
    private readonly threads: ThreadRepository,
    private readonly now: () => string,
  ) {}

  execute(input: ResolveThreadInput): ResolveThreadResult {
    const resolved = this.threads
      .load(input.epic, input.thread)
      .resolved({ closedBy: 'nick', time: this.now() })
    this.threads.save(input.epic, resolved)
    return { thread: resolved.id(), closedBy: 'nick' }
  }
}
