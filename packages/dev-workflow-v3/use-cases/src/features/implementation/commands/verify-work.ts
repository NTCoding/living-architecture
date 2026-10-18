import {
  VerificationCheck,
  VerificationResult,
} from '@living-architecture/dev-workflow-v3-domain-model'
import type { RunProjectChecks } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/run-project-checks'

/** @riviere-role command-use-case-input */
export interface VerifyWorkInput {
  readonly worktreePath: string
}

/** @riviere-role command-use-case-result-value */
export interface VerificationCheckResult {
  readonly name: string
  readonly passed: boolean
}

/** @riviere-role command-use-case-result */
export interface VerifyWorkResult {
  readonly green: boolean
  readonly checks: readonly VerificationCheckResult[]
}

/** @riviere-role command-use-case */
export class VerifyWork {
  constructor(private readonly runProjectChecks: RunProjectChecks) {}

  async execute(input: VerifyWorkInput): Promise<VerifyWorkResult> {
    const outcome = await this.runProjectChecks({ worktreePath: input.worktreePath })
    const checks = outcome.checks.map((check) => VerificationCheck.from(check))
    return {
      green: VerificationResult.from(checks).isGreen(),
      checks: checks.map((check) => ({ name: check.name(), passed: check.passed() })),
    }
  }
}
