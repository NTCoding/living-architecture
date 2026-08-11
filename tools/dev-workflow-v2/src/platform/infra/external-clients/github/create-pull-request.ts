import { z } from 'zod'

const pullRequestSchema = z.object({
  number: z.number().int().positive(),
  url: z.string().url(),
  isDraft: z.boolean(),
})

const createPullRequestOutputSchema = z.object({ url: z.string().url() })

/** @riviere-role external-client-model */
export interface GithubPullRequestCreationInput {
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
      '--title',
      request.title,
      '--body',
      request.body,
      '--json',
      'url',
    ])
    const pullRequestUrl = readPullRequestUrl(createOutput)
    return readPullRequest(runGh, pullRequestUrl)
  }
}

function readPullRequestUrl(createOutput: string): string {
  const trimmedOutput = createOutput.trim()
  if (trimmedOutput.length === 0) {
    throw new PullRequestCreationOutputError(
      'Expected gh pr create to return JSON with a url field. Got empty output.',
    )
  }

  try {
    return createPullRequestOutputSchema.parse(JSON.parse(trimmedOutput)).url
  } catch {
    throw new PullRequestCreationOutputError(
      `Expected gh pr create to return JSON with a url field. Got: ${trimmedOutput}`,
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
