import { z } from 'zod'

const pullRequestSchema = z.object({
  number: z.number().int().positive(),
  url: z.string().url(),
  isDraft: z.boolean(),
})

/** @riviere-role external-client-model */
export interface GithubPullRequestCreationInput {
  readonly branch: string
  readonly body: string
  readonly title: string
}

/** @riviere-role external-client-model */
export type GithubPullRequest = {
  readonly prNumber: number
  readonly prUrl: string
  readonly isDraft: boolean
}

/** @riviere-role external-client-model */
type GhRunner = (args: readonly string[]) => string

/** @riviere-role external-client-error */
class PullRequestCreationOutputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PullRequestCreationOutputError'
  }
}

/** @riviere-role external-client-service */
export function createGithubPullRequestClient(
  runGh: GhRunner,
): (request: GithubPullRequestCreationInput) => GithubPullRequest {
  return (request: GithubPullRequestCreationInput): GithubPullRequest => {
    const createOutput = runGh([
      'pr',
      'create',
      '--head',
      request.branch,
      '--title',
      request.title,
      '--body',
      request.body,
    ])
    const pullRequestUrl = readPullRequestUrl(createOutput)
    return readPullRequest(runGh, pullRequestUrl)
  }
}

function readPullRequestUrl(createOutput: string): string {
  const trimmedOutput = createOutput.trim()
  if (trimmedOutput.length === 0) {
    throw new PullRequestCreationOutputError(
      'Expected gh pr create to return a URL. Got empty output.',
    )
  }

  try {
    return z.string().url().parse(trimmedOutput)
  } catch {
    throw new PullRequestCreationOutputError(
      `Expected gh pr create to return a URL. Got: ${trimmedOutput}`,
    )
  }
}

function readPullRequest(runGh: GhRunner, pullRequestReference: string): GithubPullRequest {
  const rawPullRequest = runGh(['pr', 'view', pullRequestReference, '--json', 'number,url,isDraft'])
  const pullRequest = pullRequestSchema.parse(JSON.parse(rawPullRequest))
  return {
    prNumber: pullRequest.number,
    prUrl: pullRequest.url,
    isDraft: pullRequest.isDraft,
  }
}
