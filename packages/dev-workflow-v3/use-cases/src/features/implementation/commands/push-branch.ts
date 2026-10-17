import type { WorktreeReference } from '@living-architecture/dev-workflow-v3-domain-model'
import type { PushBranch as PushBranchPort } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/push-branch'

/** @riviere-role command-use-case-input */
export interface PushBranchInput {
  readonly worktree: WorktreeReference
}

/** @riviere-role command-use-case-result */
export interface PushBranchResult {
  readonly branch: string
}

/** @riviere-role command-use-case */
export class PushBranch {
  constructor(private readonly pushBranch: PushBranchPort) {}

  async execute(input: PushBranchInput): Promise<PushBranchResult> {
    await this.pushBranch({
      worktreePath: input.worktree.path(),
      branch: input.worktree.branch(),
    })
    return { branch: input.worktree.branch() }
  }
}
