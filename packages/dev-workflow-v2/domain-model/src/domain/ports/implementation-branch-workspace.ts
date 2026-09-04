type BranchCommitRelation = 'ahead' | 'at-default' | 'divergent' | 'stale'

/**
 * @riviere-role domain-port
 * @riviere-role-justification Branch preparation needs the checkout's current Git facts and applies an approved preparation while the domain behaviour runs. These facts are external workspace state, not previously created MaintainerWorkflow state.
 */
export interface ImplementationBranchWorkspace {
  apply(
    preparation:
      | {
          readonly type: 'create-target'
          readonly remoteDefaultBranch: string
          readonly targetBranch: string
          readonly upstream: 'none'
        }
      | {
          readonly type: 'keep-current'
          readonly targetBranch: string
          readonly upstream: 'preserve' | 'remove-default'
        }
      | {
          readonly type: 'select-target'
          readonly targetBranch: string
          readonly upstream: 'preserve' | 'remove-default'
        },
  ): void
  inspect(
    targetBranch: string,
    currentBranch: string,
  ): {
    readonly currentBranchRelation: BranchCommitRelation
    readonly currentBranchUpstream:
      | { readonly type: 'configured'; readonly branch: string }
      | { readonly type: 'none' }
    readonly remoteDefaultBranch: {
      readonly commit: string
      readonly name: string
      readonly reference: string
    }
    readonly targetBranch:
      | { readonly type: 'absent' }
      | {
          readonly type: 'available'
          readonly relation: BranchCommitRelation
          readonly remote:
            | { readonly type: 'absent' }
            | {
                readonly type: 'available'
                readonly relation: BranchCommitRelation
              }
          readonly upstream:
            | { readonly type: 'configured'; readonly branch: string }
            | { readonly type: 'none' }
        }
      | { readonly type: 'checked-out-elsewhere'; readonly worktreePath: string }
      | {
          readonly type: 'remote-only'
          readonly relation: BranchCommitRelation
        }
    readonly targetBranchName: string
  }
  readCheckout(): {
    readonly branch:
      | { readonly type: 'detached' }
      | { readonly type: 'selected'; readonly name: string }
    readonly workingTree: 'clean' | 'dirty'
  }
  readPreparedBranch(): {
    readonly branch:
      | { readonly type: 'detached' }
      | { readonly type: 'selected'; readonly name: string }
    readonly commit: string
  }
  validateTargetBranch(targetBranch: string): void
}
