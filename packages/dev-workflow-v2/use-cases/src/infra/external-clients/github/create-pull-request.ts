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

/** @riviere-role external-client-error */
class PullRequestReconciliationError extends Error {
  constructor(creationError: unknown, reconciliationError: unknown) {
    super('PR creation failed and the subsequent reconciliation failed.', {
      cause: { creationError, reconciliationError },
    })
    this.name = 'PullRequestReconciliationError'
  }
}

/** @riviere-role external-client-service */
export function createGithubPullRequestClient(
  runGh: GhRunner,
): (request: GithubPullRequestCreationInput) => GithubPullRequest {
  return (request: GithubPullRequestCreationInput): GithubPullRequest => {
    const existing = findOpenPullRequest(runGh, request.branch)
    if (existing !== undefined) return existing
    try {
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
      return readPullRequest(runGh, readPullRequestUrl(createOutput))
    } catch (creationError) {
      return reconcileCreationFailure(runGh, request.branch, creationError)
    }
  }
}

function reconcileCreationFailure(
  runGh: GhRunner,
  branch: string,
  creationError: unknown,
): GithubPullRequest {
  try {
    const existing = findOpenPullRequest(runGh, branch)
    if (existing !== undefined) return existing
  } catch (reconciliationError) {
    throw new PullRequestReconciliationError(creationError, reconciliationError)
  }
  throw creationError
}

function findOpenPullRequest(runGh: GhRunner, branch: string): GithubPullRequest | undefined {
  const output = runGh([
    'pr',
    'list',
    '--head',
    branch,
    '--state',
    'open',
    '--limit',
    '2',
    '--json',
    'number,url,isDraft',
  ])
  const matches = z.array(pullRequestSchema).parse(JSON.parse(output))
  if (matches.length > 1) {
    throw new PullRequestCreationOutputError(
      `Expected at most one open PR for branch ${branch}. Got multiple PRs.`,
    )
  }
  const existing = matches.at(0)
  if (existing === undefined) return undefined
  return { prNumber: existing.number, prUrl: existing.url, isDraft: existing.isDraft }
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
