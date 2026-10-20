import type { ReadPullRequestDiff as ReadPullRequestDiffPort } from '@living-architecture/dev-workflow-v3-domain-model/domain/ports/read-pull-request-diff'

/** @riviere-role command-use-case-input */
export interface ReadPullRequestDiffInput {
  readonly pullRequestNumber: number
}

/** @riviere-role command-use-case-result */
export interface ReadPullRequestDiffResult {
  readonly diff: string
}

/** @riviere-role command-use-case */
export class ReadPullRequestDiff {
  constructor(private readonly readPullRequestDiff: ReadPullRequestDiffPort) {}

  async execute(input: ReadPullRequestDiffInput): Promise<ReadPullRequestDiffResult> {
    const { diff } = await this.readPullRequestDiff({
      pullRequestNumber: input.pullRequestNumber,
    })
    return { diff }
  }
}
