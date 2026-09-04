import type { ImplementationBranchWorkspace } from './ports/implementation-branch-workspace'

type CheckoutFacts = ReturnType<ImplementationBranchWorkspace['readCheckout']>
type ImplementationBranchFacts = ReturnType<ImplementationBranchWorkspace['inspect']>
type ImplementationBranchPreparationInstructions = Parameters<
  ImplementationBranchWorkspace['apply']
>[0]
type PreparedBranchFacts = ReturnType<ImplementationBranchWorkspace['readPreparedBranch']>
type BranchCommitRelation = ImplementationBranchFacts['currentBranchRelation']
type BranchUpstream = ImplementationBranchFacts['currentBranchUpstream']
type RemoteDefaultBranch = ImplementationBranchFacts['remoteDefaultBranch']

interface ImplementationBranchPreparationResult {
  readonly branch: string
  readonly remoteDefaultBranch: string
  readonly type: 'already-current' | 'created' | 'selected'
}

type ImplementationBranchPreparationFailure =
  | 'current-branch-has-commits'
  | 'detached-head'
  | 'dirty-checkout'
  | 'target-branch-has-commits'
  | 'target-branch-is-default'
  | 'target-branch-is-divergent'
  | 'target-branch-is-in-another-worktree'
  | 'target-branch-is-stale'
  | 'verification-failed'

/** @riviere-role domain-error */
export class ImplementationBranchPreparationError extends Error {
  constructor(
    readonly reason: ImplementationBranchPreparationFailure,
    message: string,
  ) {
    super(message)
    this.name = 'ImplementationBranchPreparationError'
  }
}

/** @riviere-role value-object */
export class PreparatoryCheckout {
  declare private readonly brand: 'PreparatoryCheckout'

  private constructor(private readonly selectedBranch: string) {}

  static from(facts: CheckoutFacts): PreparatoryCheckout {
    if (facts.workingTree === 'dirty') {
      throw new ImplementationBranchPreparationError(
        'dirty-checkout',
        'Working tree must be clean before preparing an implementation branch.',
      )
    }
    if (facts.branch.type === 'detached') {
      throw new ImplementationBranchPreparationError(
        'detached-head',
        'Cannot prepare an implementation branch from a detached HEAD.',
      )
    }
    return new PreparatoryCheckout(facts.branch.name)
  }

  branch(): string {
    return this.selectedBranch
  }
}

/** @riviere-role value-object */
export class ImplementationBranchPreparation {
  declare private readonly brand: 'ImplementationBranchPreparation'

  private constructor(
    private readonly preparation: ImplementationBranchPreparationInstructions,
    private readonly remoteDefault: RemoteDefaultBranch,
  ) {}

  static from(
    checkout: PreparatoryCheckout,
    facts: ImplementationBranchFacts,
  ): ImplementationBranchPreparation {
    requireFeatureBranch(facts.targetBranchName, facts.remoteDefaultBranch)
    const currentBranch = checkout.branch()
    if (currentBranch === facts.targetBranchName) {
      requireSafeTargetBranch(facts.currentBranchRelation, facts.targetBranchName)
      requireSafeRemoteTargetBranch(facts.targetBranch, facts.targetBranchName)
      return new ImplementationBranchPreparation(
        {
          type: 'keep-current',
          targetBranch: facts.targetBranchName,
          upstream: upstreamInstruction(
            facts.currentBranchUpstream,
            facts.remoteDefaultBranch.reference,
          ),
        },
        facts.remoteDefaultBranch,
      )
    }

    requireSafeCurrentBranch(facts.currentBranchRelation)
    const preparation = prepareTargetBranch(facts)
    return new ImplementationBranchPreparation(preparation, facts.remoteDefaultBranch)
  }

  instructions(): ImplementationBranchPreparationInstructions {
    return this.preparation
  }

  verify(facts: PreparedBranchFacts): ImplementationBranchPreparationResult {
    if (
      facts.branch.type === 'detached' ||
      facts.branch.name !== this.preparation.targetBranch ||
      facts.commit !== this.remoteDefault.commit
    ) {
      const branch = facts.branch.type === 'detached' ? 'detached HEAD' : facts.branch.name
      throw new ImplementationBranchPreparationError(
        'verification-failed',
        `Expected ${this.preparation.targetBranch} at ${this.remoteDefault.reference}. Got ${branch} at ${facts.commit}.`,
      )
    }
    return {
      branch: this.preparation.targetBranch,
      remoteDefaultBranch: this.remoteDefault.reference,
      type: preparationResultType(this.preparation),
    }
  }
}

function requireFeatureBranch(
  targetBranchName: string,
  remoteDefaultBranch: RemoteDefaultBranch,
): void {
  if (targetBranchName !== remoteDefaultBranch.name) return
  throw new ImplementationBranchPreparationError(
    'target-branch-is-default',
    `Target branch ${targetBranchName} must differ from the remote default branch.`,
  )
}

function requireSafeCurrentBranch(relation: BranchCommitRelation): void {
  if (relation === 'at-default' || relation === 'stale') return
  throw new ImplementationBranchPreparationError(
    'current-branch-has-commits',
    `Current branch is ${relation} relative to the refreshed remote default branch. Preserve or move its commits before preparing another implementation branch.`,
  )
}

function requireSafeTargetBranch(relation: BranchCommitRelation, targetBranchName: string): void {
  if (relation === 'at-default') return
  if (relation === 'stale') {
    throw new ImplementationBranchPreparationError(
      'target-branch-is-stale',
      `Target branch ${targetBranchName} is behind the refreshed remote default branch.`,
    )
  }
  if (relation === 'ahead') {
    throw new ImplementationBranchPreparationError(
      'target-branch-has-commits',
      `Target branch ${targetBranchName} already contains implementation commits.`,
    )
  }
  throw new ImplementationBranchPreparationError(
    'target-branch-is-divergent',
    `Target branch ${targetBranchName} has diverged from the refreshed remote default branch.`,
  )
}

function requireSafeRemoteTargetBranch(
  targetBranch: ImplementationBranchFacts['targetBranch'],
  targetBranchName: string,
): void {
  if (targetBranch.type !== 'available' || targetBranch.remote.type === 'absent') return
  requireSafeTargetBranch(targetBranch.remote.relation, targetBranchName)
}

function prepareTargetBranch(
  facts: ImplementationBranchFacts,
): ImplementationBranchPreparationInstructions {
  if (facts.targetBranch.type === 'absent') {
    return {
      type: 'create-target',
      remoteDefaultBranch: facts.remoteDefaultBranch.reference,
      targetBranch: facts.targetBranchName,
      upstream: 'none',
    }
  }
  if (facts.targetBranch.type === 'checked-out-elsewhere') {
    throw new ImplementationBranchPreparationError(
      'target-branch-is-in-another-worktree',
      `Target branch ${facts.targetBranchName} is already checked out at ${facts.targetBranch.worktreePath}.`,
    )
  }
  if (facts.targetBranch.type === 'remote-only') {
    requireSafeTargetBranch(facts.targetBranch.relation, facts.targetBranchName)
    return {
      type: 'create-target',
      remoteDefaultBranch: facts.remoteDefaultBranch.reference,
      targetBranch: facts.targetBranchName,
      upstream: 'none',
    }
  }
  requireSafeTargetBranch(facts.targetBranch.relation, facts.targetBranchName)
  requireSafeRemoteTargetBranch(facts.targetBranch, facts.targetBranchName)
  return {
    type: 'select-target',
    targetBranch: facts.targetBranchName,
    upstream: upstreamInstruction(facts.targetBranch.upstream, facts.remoteDefaultBranch.reference),
  }
}

function upstreamInstruction(
  upstream: BranchUpstream,
  remoteDefaultBranch: string,
): 'preserve' | 'remove-default' {
  if (upstream.type === 'configured' && upstream.branch === remoteDefaultBranch) {
    return 'remove-default'
  }
  return 'preserve'
}

function preparationResultType(
  preparation: ImplementationBranchPreparationInstructions,
): ImplementationBranchPreparationResult['type'] {
  const resultTypes = {
    'create-target': 'created',
    'keep-current': 'already-current',
    'select-target': 'selected',
  } as const satisfies Record<
    ImplementationBranchPreparationInstructions['type'],
    ImplementationBranchPreparationResult['type']
  >
  return resultTypes[preparation.type]
}
