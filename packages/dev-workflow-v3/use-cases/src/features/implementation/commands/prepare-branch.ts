import {
  BranchName,
  WorktreeReference,
  type IssueReference,
} from '@living-architecture/dev-workflow-v3-domain-model'
import type { PrepareWorktree } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/prepare-worktree'

/** @riviere-role command-use-case-input */
export interface PrepareBranchInput {
  readonly issue: IssueReference
  readonly worktreesDirectory: string
}

/** @riviere-role command-use-case-result */
export interface PrepareBranchResult {
  readonly worktree: WorktreeReference
}

/** @riviere-role command-use-case */
export class PrepareBranch {
  constructor(private readonly prepareWorktree: PrepareWorktree) {}

  async execute(input: PrepareBranchInput): Promise<PrepareBranchResult> {
    const branch = BranchName.fromIssueNumberAndTitle(
      input.issue.number().value(),
      input.issue.title(),
    )
    const worktreePath = `${input.worktreesDirectory}/${branch.value()}`
    await this.prepareWorktree({ worktreePath, branch: branch.value() })
    return { worktree: WorktreeReference.from({ path: worktreePath, branch: branch.value() }) }
  }
}
