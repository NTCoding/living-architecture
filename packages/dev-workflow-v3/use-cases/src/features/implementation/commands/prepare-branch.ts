import { BranchName } from '@living-architecture/dev-workflow-v3-domain-model'
import type { PrepareWorktree } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/prepare-worktree'

/** @riviere-role command-use-case-input */
export interface PrepareBranchInput {
  readonly issueNumber: number
  readonly issueTitle: string
  readonly worktreesDirectory: string
}

/** @riviere-role command-use-case-result */
export interface PrepareBranchResult {
  readonly worktreePath: string
  readonly branch: string
}

/** @riviere-role command-use-case */
export class PrepareBranch {
  constructor(private readonly prepareWorktree: PrepareWorktree) {}

  async execute(input: PrepareBranchInput): Promise<PrepareBranchResult> {
    const branch = BranchName.fromIssueNumberAndTitle(input.issueNumber, input.issueTitle)
    const worktreePath = `${input.worktreesDirectory}/${branch.value()}`
    await this.prepareWorktree({ worktreePath, branch: branch.value() })
    return { worktreePath, branch: branch.value() }
  }
}
