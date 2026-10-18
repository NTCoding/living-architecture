import type { CheckWorkCommitted as CheckWorkCommittedPort } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/check-work-committed'

/** @riviere-role command-use-case-input */
export interface CheckWorkCommittedInput {
  readonly worktreePath: string
  readonly from: string | null
}

/** @riviere-role command-use-case-result */
export interface CheckWorkCommittedResult {
  readonly clean: boolean
  readonly hasCommit: boolean
  readonly sha: string
  readonly status: string
  readonly changedFiles: readonly string[]
}

/** @riviere-role command-use-case */
export class CheckWorkCommitted {
  constructor(private readonly checkWorkCommitted: CheckWorkCommittedPort) {}

  async execute(input: CheckWorkCommittedInput): Promise<CheckWorkCommittedResult> {
    return await this.checkWorkCommitted({ worktreePath: input.worktreePath, from: input.from })
  }
}
