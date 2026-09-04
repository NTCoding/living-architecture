import type { ImplementationBranchWorkspace } from '@living-architecture/dev-workflow-v2-domain-model/domain/ports/implementation-branch-workspace'
import type {
  GitBranchClient,
  GitBranchUpstream,
} from '../../../../infra/external-clients/git/git-branch-client'

type ImplementationBranchFacts = ReturnType<ImplementationBranchWorkspace['inspect']>
type BranchUpstream = ImplementationBranchFacts['currentBranchUpstream']
type TargetBranchFacts = ImplementationBranchFacts['targetBranch']
type ImplementationBranchPreparationInstructions = Parameters<
  ImplementationBranchWorkspace['apply']
>[0]

function branchUpstream(upstream: GitBranchUpstream): BranchUpstream {
  if (upstream.type === 'none') return { type: 'none' }
  return { type: 'configured', branch: upstream.branch }
}

function targetBranchFacts(
  git: GitBranchClient,
  targetBranch: string,
  remoteDefaultBranch: string,
): TargetBranchFacts {
  const remoteBranch = git.refreshRemoteBranch(targetBranch)
  if (!git.branchExists(targetBranch)) {
    if (remoteBranch.type === 'absent') return { type: 'absent' }
    return {
      type: 'remote-only',
      relation: git.commitRelation(remoteDefaultBranch, remoteBranch.reference),
    }
  }
  const checkout = git.branchCheckout(targetBranch)
  if (checkout.type === 'another-worktree') {
    return { type: 'checked-out-elsewhere', worktreePath: checkout.path }
  }
  return {
    type: 'available',
    relation: git.commitRelation(remoteDefaultBranch, targetBranch),
    remote:
      remoteBranch.type === 'absent'
        ? { type: 'absent' }
        : {
            type: 'available',
            relation: git.commitRelation(remoteDefaultBranch, remoteBranch.reference),
          },
    upstream: branchUpstream(git.branchUpstream(targetBranch)),
  }
}

function applyUpstreamInstruction(
  git: GitBranchClient,
  targetBranch: string,
  upstream: 'preserve' | 'remove-default',
): void {
  if (upstream === 'preserve') return
  git.removeUpstream(targetBranch)
}

function applyPreparation(
  git: GitBranchClient,
  preparation: ImplementationBranchPreparationInstructions,
): void {
  if (preparation.type === 'create-target') {
    git.createBranch(
      preparation.targetBranch,
      preparation.remoteDefaultBranch,
      preparation.upstream,
    )
    return
  }
  if (preparation.type === 'keep-current') {
    applyUpstreamInstruction(git, preparation.targetBranch, preparation.upstream)
    return
  }
  const selectPreparation: Extract<
    ImplementationBranchPreparationInstructions,
    { readonly type: 'select-target' }
  > = preparation
  git.selectBranch(selectPreparation.targetBranch)
  applyUpstreamInstruction(git, selectPreparation.targetBranch, selectPreparation.upstream)
}

/** @riviere-role domain-port-adapter */
export function createImplementationBranchWorkspace(
  git: GitBranchClient,
): ImplementationBranchWorkspace {
  return {
    apply: (preparation) => applyPreparation(git, preparation),
    inspect: (targetBranch, currentBranch) => {
      const remoteDefaultBranch = git.refreshRemoteDefaultBranch()
      const facts: ImplementationBranchFacts = {
        currentBranchRelation: git.commitRelation(remoteDefaultBranch.reference, 'HEAD'),
        currentBranchUpstream: branchUpstream(git.branchUpstream(currentBranch)),
        remoteDefaultBranch,
        targetBranch: targetBranchFacts(git, targetBranch, remoteDefaultBranch.reference),
        targetBranchName: targetBranch,
      }
      return facts
    },
    readCheckout: () => ({
      branch: git.currentBranch(),
      workingTree: git.workingTreeIsClean() ? 'clean' : 'dirty',
    }),
    readPreparedBranch: () => ({
      branch: git.currentBranch(),
      commit: git.commit('HEAD'),
    }),
    validateTargetBranch: (targetBranch) => git.validateBranchName(targetBranch),
  }
}
