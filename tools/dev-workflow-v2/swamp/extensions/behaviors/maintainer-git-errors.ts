export class CommitMessageRejected extends Error {
  constructor(reason: string) {
    super(reason)
    this.name = 'CommitMessageRejected'
  }
}

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

export class WorkingTreeDirty extends Error {
  constructor(stage: string, detail: string) {
    super(`the working tree is not clean ${stage}:\n${detail}`)
    this.name = 'WorkingTreeDirty'
  }
}

export class NoCommitsAhead extends Error {
  constructor(base: string, found: string) {
    super(`expected commits ahead of ${base}, found ${found}`)
    this.name = 'NoCommitsAhead'
  }
}

export class PullRequestNotIdentified extends Error {
  constructor(detail: string) {
    super(`could not identify the pull request that was created: ${detail}`)
    this.name = 'PullRequestNotIdentified'
  }
}

export class ReviewerTimedOut extends Error {
  constructor(sha: string, seconds: number) {
    super(`the external reviewer did not review ${sha} within ${String(seconds)}s`)
    this.name = 'ReviewerTimedOut'
  }
}

export class RunCancelled extends Error {
  constructor(what: string) {
    super(`${what} was not completed because the run was cancelled`)
    this.name = 'RunCancelled'
  }
}

export class ReviewerResponseUnreadable extends Error {
  constructor(detail: string) {
    super(`could not read the pull request reviews: ${detail}`)
    this.name = 'ReviewerResponseUnreadable'
  }
}

export class InvalidIssueNumber extends Error {
  constructor(received: string) {
    super(`issue must be a positive integer, received ${received}`)
    this.name = 'InvalidIssueNumber'
  }
}

export class InvalidDefinitionDocument extends Error {
  constructor(detail: string) {
    super(`the definition document is not readable: ${detail}`)
    this.name = 'InvalidDefinitionDocument'
  }
}
