import { describe, expect, it } from 'vitest'
import {
  ImplementationBranchPreparation,
  ImplementationBranchPreparationError,
  PreparatoryCheckout,
} from './implementation-branch-preparation'
import type { ImplementationBranchWorkspace } from './ports/implementation-branch-workspace'

type ImplementationBranchFacts = ReturnType<ImplementationBranchWorkspace['inspect']>
type BranchCommitRelation = ImplementationBranchFacts['currentBranchRelation']
type TargetBranchFacts = ImplementationBranchFacts['targetBranch']

const remoteDefaultBranch = {
  commit: 'default-commit',
  name: 'trunk',
  reference: 'origin/trunk',
} as const

function cleanCheckout(branch = 'trunk'): PreparatoryCheckout {
  return PreparatoryCheckout.from({
    branch: { type: 'selected', name: branch },
    workingTree: 'clean',
  })
}

function preparationFacts(
  currentBranchRelation: BranchCommitRelation = 'at-default',
  targetBranch: TargetBranchFacts = { type: 'absent' },
): ImplementationBranchFacts {
  return {
    currentBranchRelation,
    currentBranchUpstream: { type: 'configured', branch: 'origin/trunk' },
    remoteDefaultBranch,
    targetBranch,
    targetBranchName: 'issue-42-example',
  }
}

describe('PreparatoryCheckout', () => {
  it('retains the selected branch when the checkout is clean', () => {
    expect(cleanCheckout().branch()).toBe('trunk')
  })

  it('rejects a dirty checkout', () => {
    expect(() =>
      PreparatoryCheckout.from({
        branch: { type: 'selected', name: 'trunk' },
        workingTree: 'dirty',
      }),
    ).toThrowError(expect.objectContaining({ reason: 'dirty-checkout' }))
  })

  it('rejects a detached checkout', () => {
    expect(() =>
      PreparatoryCheckout.from({ branch: { type: 'detached' }, workingTree: 'clean' }),
    ).toThrowError(expect.objectContaining({ reason: 'detached-head' }))
  })
})

describe('ImplementationBranchPreparation', () => {
  it('creates an absent target from the remote default', () => {
    const preparation = ImplementationBranchPreparation.from(cleanCheckout(), preparationFacts())

    expect(preparation.instructions()).toStrictEqual({
      type: 'create-target',
      remoteDefaultBranch: 'origin/trunk',
      targetBranch: 'issue-42-example',
      upstream: 'none',
    })
    expect(
      preparation.verify({
        branch: { type: 'selected', name: 'issue-42-example' },
        commit: 'default-commit',
      }),
    ).toStrictEqual({
      branch: 'issue-42-example',
      remoteDefaultBranch: 'origin/trunk',
      type: 'created',
    })
  })

  it('creates an absent target when the current branch is behind the remote default', () => {
    expect(
      ImplementationBranchPreparation.from(
        cleanCheckout(),
        preparationFacts('stale'),
      ).instructions(),
    ).toMatchObject({ type: 'create-target' })
  })

  it.each(['ahead', 'divergent'] as const)(
    'rejects a current branch which is %s of the remote default',
    (relation) => {
      expect(() =>
        ImplementationBranchPreparation.from(cleanCheckout(), preparationFacts(relation)),
      ).toThrowError(expect.objectContaining({ reason: 'current-branch-has-commits' }))
    },
  )

  it('rejects the remote default as the target branch', () => {
    const facts = { ...preparationFacts(), targetBranchName: 'trunk' }

    expect(() => ImplementationBranchPreparation.from(cleanCheckout(), facts)).toThrowError(
      expect.objectContaining({ reason: 'target-branch-is-default' }),
    )
  })

  it('keeps an exact target which is already current and removes its default upstream', () => {
    const preparation = ImplementationBranchPreparation.from(
      cleanCheckout('issue-42-example'),
      preparationFacts(),
    )

    expect(preparation.instructions()).toStrictEqual({
      type: 'keep-current',
      targetBranch: 'issue-42-example',
      upstream: 'remove-default',
    })
    expect(
      preparation.verify({
        branch: { type: 'selected', name: 'issue-42-example' },
        commit: 'default-commit',
      }),
    ).toMatchObject({ type: 'already-current' })
  })

  it('preserves a non-default upstream on an exact target which is already current', () => {
    const facts = {
      ...preparationFacts(),
      currentBranchUpstream: { type: 'configured', branch: 'origin/issue-42-example' } as const,
    }

    expect(
      ImplementationBranchPreparation.from(cleanCheckout('issue-42-example'), facts).instructions(),
    ).toMatchObject({ upstream: 'preserve' })
  })

  it('preserves an absent upstream on an exact target which is already current', () => {
    const facts = {
      ...preparationFacts(),
      currentBranchUpstream: { type: 'none' } as const,
    }

    expect(
      ImplementationBranchPreparation.from(cleanCheckout('issue-42-example'), facts).instructions(),
    ).toMatchObject({ upstream: 'preserve' })
  })

  it.each([
    ['stale', 'target-branch-is-stale'],
    ['ahead', 'target-branch-has-commits'],
    ['divergent', 'target-branch-is-divergent'],
  ] as const)('rejects an already-current target which is %s', (relation, reason) => {
    expect(() =>
      ImplementationBranchPreparation.from(
        cleanCheckout('issue-42-example'),
        preparationFacts(relation),
      ),
    ).toThrowError(expect.objectContaining({ reason }))
  })

  it('rejects a target checked out in another worktree', () => {
    const targetBranch: TargetBranchFacts = {
      type: 'checked-out-elsewhere',
      worktreePath: '/other/worktree',
    }

    expect(() =>
      ImplementationBranchPreparation.from(
        cleanCheckout(),
        preparationFacts('at-default', targetBranch),
      ),
    ).toThrowError(expect.objectContaining({ reason: 'target-branch-is-in-another-worktree' }))
  })

  it.each([
    ['stale', 'target-branch-is-stale'],
    ['ahead', 'target-branch-has-commits'],
    ['divergent', 'target-branch-is-divergent'],
  ] as const)('rejects an existing target which is %s', (relation, reason) => {
    const targetBranch: TargetBranchFacts = {
      type: 'available',
      relation,
      remote: { type: 'absent' },
      upstream: { type: 'none' },
    }

    expect(() =>
      ImplementationBranchPreparation.from(
        cleanCheckout(),
        preparationFacts('at-default', targetBranch),
      ),
    ).toThrowError(expect.objectContaining({ reason }))
  })

  it('selects an exact existing target and removes its default upstream', () => {
    const targetBranch: TargetBranchFacts = {
      type: 'available',
      relation: 'at-default',
      remote: { type: 'absent' },
      upstream: { type: 'configured', branch: 'origin/trunk' },
    }
    const preparation = ImplementationBranchPreparation.from(
      cleanCheckout(),
      preparationFacts('at-default', targetBranch),
    )

    expect(preparation.instructions()).toStrictEqual({
      type: 'select-target',
      targetBranch: 'issue-42-example',
      upstream: 'remove-default',
    })
    expect(
      preparation.verify({
        branch: { type: 'selected', name: 'issue-42-example' },
        commit: 'default-commit',
      }),
    ).toMatchObject({ type: 'selected' })
  })

  it('selects an exact existing target without changing its feature upstream', () => {
    const targetBranch: TargetBranchFacts = {
      type: 'available',
      relation: 'at-default',
      remote: { type: 'absent' },
      upstream: { type: 'configured', branch: 'origin/issue-42-example' },
    }

    expect(
      ImplementationBranchPreparation.from(
        cleanCheckout(),
        preparationFacts('at-default', targetBranch),
      ).instructions(),
    ).toMatchObject({ upstream: 'preserve' })
  })

  it('creates a remote-only target when it still matches the remote default', () => {
    expect(
      ImplementationBranchPreparation.from(
        cleanCheckout(),
        preparationFacts('at-default', {
          type: 'remote-only',
          relation: 'at-default',
        }),
      ).instructions(),
    ).toStrictEqual({
      type: 'create-target',
      remoteDefaultBranch: 'origin/trunk',
      targetBranch: 'issue-42-example',
      upstream: 'none',
    })
  })

  it.each([
    ['stale', 'target-branch-is-stale'],
    ['ahead', 'target-branch-has-commits'],
    ['divergent', 'target-branch-is-divergent'],
  ] as const)('rejects a remote-only target which is %s', (relation, reason) => {
    expect(() =>
      ImplementationBranchPreparation.from(
        cleanCheckout(),
        preparationFacts('at-default', { type: 'remote-only', relation }),
      ),
    ).toThrowError(expect.objectContaining({ reason }))
  })

  it('rejects a remote target containing commits even when its local branch is exact', () => {
    expect(() =>
      ImplementationBranchPreparation.from(
        cleanCheckout(),
        preparationFacts('at-default', {
          type: 'available',
          relation: 'at-default',
          remote: { type: 'available', relation: 'ahead' },
          upstream: { type: 'none' },
        }),
      ),
    ).toThrowError(expect.objectContaining({ reason: 'target-branch-has-commits' }))
  })

  it('rejects a remote target containing commits when its exact local branch is current', () => {
    expect(() =>
      ImplementationBranchPreparation.from(
        cleanCheckout('issue-42-example'),
        preparationFacts('at-default', {
          type: 'available',
          relation: 'at-default',
          remote: { type: 'available', relation: 'ahead' },
          upstream: { type: 'none' },
        }),
      ),
    ).toThrowError(expect.objectContaining({ reason: 'target-branch-has-commits' }))
  })

  it('rejects verification when the target branch was not selected', () => {
    const preparation = ImplementationBranchPreparation.from(cleanCheckout(), preparationFacts())

    expect(() =>
      preparation.verify({
        branch: { type: 'selected', name: 'trunk' },
        commit: 'default-commit',
      }),
    ).toThrowError(ImplementationBranchPreparationError)
  })

  it('rejects verification when the target commit differs from the remote default', () => {
    const preparation = ImplementationBranchPreparation.from(cleanCheckout(), preparationFacts())

    expect(() =>
      preparation.verify({
        branch: { type: 'selected', name: 'issue-42-example' },
        commit: 'other-commit',
      }),
    ).toThrowError(expect.objectContaining({ reason: 'verification-failed' }))
  })

  it('rejects verification when checkout becomes detached', () => {
    const preparation = ImplementationBranchPreparation.from(cleanCheckout(), preparationFacts())

    expect(() =>
      preparation.verify({ branch: { type: 'detached' }, commit: 'default-commit' }),
    ).toThrowError(expect.objectContaining({ reason: 'verification-failed' }))
  })
})
