import {
  VerificationCheck,
  VerificationResult,
  type WorktreeReference,
} from '@living-architecture/dev-workflow-v3-domain-model'
import type { RunProjectChecks } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/run-project-checks'

/** @riviere-role command-use-case-input */
export interface VerifyWorkInput {
  readonly worktree: WorktreeReference
}

/** @riviere-role command-use-case-result */
export interface VerifyWorkResult {
  readonly verification: VerificationResult
}

/** @riviere-role command-use-case */
export class VerifyWork {
  constructor(private readonly runProjectChecks: RunProjectChecks) {}

  async execute(input: VerifyWorkInput): Promise<VerifyWorkResult> {
    const outcome = await this.runProjectChecks({ worktreePath: input.worktree.path() })
    return {
      verification: VerificationResult.from(
        outcome.checks.map((check) => VerificationCheck.from(check)),
      ),
    }
  }
}
