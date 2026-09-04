import {
  ImplementationBranchPreparation,
  PreparatoryCheckout,
} from '@living-architecture/dev-workflow-v2-domain-model/domain/implementation-branch-preparation'
import type { ImplementationBranchWorkspace } from '@living-architecture/dev-workflow-v2-domain-model/domain/ports/implementation-branch-workspace'

/** @riviere-role command-use-case-input */
export interface PrepareImplementationBranchInput {
  readonly targetBranch: string
}

/** @riviere-role command-use-case-result */
export interface PrepareImplementationBranchResult {
  readonly branch: string
  readonly remoteDefaultBranch: string
  readonly type: 'already-current' | 'created' | 'selected'
}

/** @riviere-role command-use-case */
export class PrepareImplementationBranch {
  constructor(private readonly workspace: ImplementationBranchWorkspace) {}

  execute(input: PrepareImplementationBranchInput): PrepareImplementationBranchResult {
    this.workspace.validateTargetBranch(input.targetBranch)
    const checkout = PreparatoryCheckout.from(this.workspace.readCheckout())
    const preparation = ImplementationBranchPreparation.from(
      checkout,
      this.workspace.inspect(input.targetBranch, checkout.branch()),
    )
    this.workspace.apply(preparation.instructions())
    const verifiedBranch = preparation.verify(this.workspace.readPreparedBranch())
    return {
      branch: verifiedBranch.branch,
      remoteDefaultBranch: verifiedBranch.remoteDefaultBranch,
      type: verifiedBranch.type,
    }
  }
}
