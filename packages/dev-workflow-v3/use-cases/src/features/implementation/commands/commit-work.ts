import {
  CommitRecord,
  type WorktreeReference,
} from '@living-architecture/dev-workflow-v3-domain-model'
import type { CommitWork as CommitWorkPort } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/commit-work'

/** @riviere-role command-use-case-input */
export interface CommitWorkInput {
  readonly worktree: WorktreeReference
  readonly message: string
}

/** @riviere-role command-use-case-result */
export interface CommitWorkResult {
  readonly commit: CommitRecord
}

/** @riviere-role command-use-case */
export class CommitWork {
  constructor(private readonly commitWork: CommitWorkPort) {}

  async execute(input: CommitWorkInput): Promise<CommitWorkResult> {
    const commit = await this.commitWork({
      worktreePath: input.worktree.path(),
      message: input.message,
    })
    return { commit: CommitRecord.parse({ sha: commit.sha, message: input.message }) }
  }
}
