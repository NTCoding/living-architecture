import {
  PullRequestReference,
  type PullRequestDraft,
  type WorktreeReference,
} from '@living-architecture/dev-workflow-v3-domain-model'
import type { OpenPullRequest as OpenPullRequestPort } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/open-pull-request'

/** @riviere-role command-use-case-input */
export interface OpenPullRequestInput {
  readonly worktree: WorktreeReference
  readonly draft: PullRequestDraft
}

/** @riviere-role command-use-case-result */
export interface OpenPullRequestResult {
  readonly pullRequest: PullRequestReference
}

/** @riviere-role command-use-case */
export class OpenPullRequest {
  constructor(private readonly openPullRequest: OpenPullRequestPort) {}

  async execute(input: OpenPullRequestInput): Promise<OpenPullRequestResult> {
    const created = await this.openPullRequest({
      worktreePath: input.worktree.path(),
      branch: input.worktree.branch(),
      title: input.draft.title(),
      body: input.draft.description(),
    })
    return { pullRequest: PullRequestReference.from(created) }
  }
}
