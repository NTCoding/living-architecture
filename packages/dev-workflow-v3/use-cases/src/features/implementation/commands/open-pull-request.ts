import {
  PullRequestDraft,
  PullRequestReference,
} from '@living-architecture/dev-workflow-v3-domain-model'
import type { OpenPullRequest as OpenPullRequestPort } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/open-pull-request'

/** @riviere-role command-use-case-input */
export interface OpenPullRequestInput {
  readonly worktreePath: string
  readonly branch: string
  readonly title: string
  readonly description: string
}

/** @riviere-role command-use-case-result */
export interface OpenPullRequestResult {
  readonly number: number
  readonly url: string
}

/** @riviere-role command-use-case */
export class OpenPullRequest {
  constructor(private readonly openPullRequest: OpenPullRequestPort) {}

  async execute(input: OpenPullRequestInput): Promise<OpenPullRequestResult> {
    const draft = PullRequestDraft.parse({ title: input.title, description: input.description })
    const created = await this.openPullRequest({
      worktreePath: input.worktreePath,
      branch: input.branch,
      title: draft.title(),
      body: draft.description(),
    })
    const pullRequest = PullRequestReference.from(created)
    return { number: pullRequest.number(), url: pullRequest.url() }
  }
}
