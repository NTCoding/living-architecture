import { CommitRecord } from '@living-architecture/dev-workflow-v3-domain-model'
import type { CommitWork as CommitWorkPort } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/commit-work'

/** @riviere-role command-use-case-input */
export interface CommitWorkInput {
  readonly worktreePath: string
  readonly message: string
}

/** @riviere-role command-use-case-result */
export interface CommitWorkResult {
  readonly sha: string
  readonly message: string
}

/** @riviere-role command-use-case */
export class CommitWork {
  constructor(private readonly commitWork: CommitWorkPort) {}

  async execute(input: CommitWorkInput): Promise<CommitWorkResult> {
    const committed = await this.commitWork({
      worktreePath: input.worktreePath,
      message: input.message,
    })
    const commit = CommitRecord.parse({ sha: committed.sha, message: input.message })
    return { sha: commit.sha(), message: commit.message() }
  }
}
