/**
 * Errors the maintainer git behaviour throws.
 *
 * Each one names a distinct failure, so a workflow run record says what went
 * wrong without the reader having to parse a message.
 */

/** A commit message the repository conventions would reject. */
export class CommitMessageRejected extends Error {
  constructor(reason: string) {
    super(reason)
    this.name = 'CommitMessageRejected'
  }
}

/** A git or gh command exited non-zero. */
export class CommandFailed extends Error {
  constructor(
    readonly action: string,
    readonly exitCode: number,
    readonly output: string,
  ) {
    super(`${action} failed with exit code ${exitCode}: ${output}`)
    this.name = 'CommandFailed'
  }
}

/** Work cannot start because the working tree is not clean. */
export class WorkingTreeDirty extends Error {
  constructor(stage: string, detail: string) {
    super(`the working tree is not clean ${stage}:\n${detail}`)
    this.name = 'WorkingTreeDirty'
  }
}

/** The branch carries no commits beyond the default branch. */
export class NoCommitsAhead extends Error {
  constructor(base: string, found: string) {
    super(`expected commits ahead of ${base}, found ${found}`)
    this.name = 'NoCommitsAhead'
  }
}

/** `gh pr create` succeeded but its output named no pull request. */
export class PullRequestNotIdentified extends Error {
  constructor(detail: string) {
    super(`could not identify the pull request that was created: ${detail}`)
    this.name = 'PullRequestNotIdentified'
  }
}

/** The external reviewer did not review the pushed commit in time. */
export class ReviewerTimedOut extends Error {
  constructor(sha: string, seconds: number) {
    super(`the external reviewer did not review ${sha} within ${String(seconds)}s`)
    this.name = 'ReviewerTimedOut'
  }
}

/** The run was cancelled before or during a command. */
export class RunCancelled extends Error {
  constructor(what: string) {
    super(`${what} was not completed because the run was cancelled`)
    this.name = 'RunCancelled'
  }
}

/** The forge returned a response this behaviour cannot read. */
export class ReviewerResponseUnreadable extends Error {
  constructor(detail: string) {
    super(`could not read the pull request reviews: ${detail}`)
    this.name = 'ReviewerResponseUnreadable'
  }
}

/** An issue number that cannot form a branch name. */
export class InvalidIssueNumber extends Error {
  constructor(received: string) {
    super(`issue must be a positive integer, received ${received}`)
    this.name = 'InvalidIssueNumber'
  }
}

/** A definition document that is not shaped the way the checks require. */
export class InvalidDefinitionDocument extends Error {
  constructor(detail: string) {
    super(`the definition document is not readable: ${detail}`)
    this.name = 'InvalidDefinitionDocument'
  }
}
