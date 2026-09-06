import { z } from 'zod'

const pullRequestSchema = z.object({
  number: z.number().int().positive(),
  url: z.string().url(),
  isDraft: z.boolean(),
  baseRefOid: z.string().regex(/^[0-9a-f]{40}$/),
  headRefOid: z.string().regex(/^[0-9a-f]{40}$/),
  headRefName: z.string().min(1),
  baseRefName: z.string().min(1),
})

const pullRequestFields = pullRequestSchema.keyof().options.join(',')

/** @riviere-role external-client-model */
export interface GithubPullRequestCreationInput {
  readonly baseBranch: string
  readonly branch: string
  readonly body: string
  readonly title: string
}

/** @riviere-role external-client-model */
export type GithubPullRequest = {
  readonly prNumber: number
  readonly prUrl: string
  readonly isDraft: boolean
  readonly repository: string
  readonly baseRevision: string
  readonly headRevision: string
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
    const existing = findOpenPullRequest(runGh, request.branch, request.baseBranch)
    if (existing !== undefined) return existing
    try {
      const createOutput = runGh([
        'pr',
        'create',
        '--head',
        request.branch,
        '--base',
        request.baseBranch,
        '--title',
        request.title,
        '--body',
        request.body,
      ])
      return readPullRequest(
        runGh,
        readPullRequestUrl(createOutput),
        request.branch,
        request.baseBranch,
      )
    } catch (creationError) {
      return reconcileCreationFailure(runGh, request.branch, request.baseBranch, creationError)
    }
  }
}

function reconcileCreationFailure(
  runGh: GhRunner,
  branch: string,
  baseBranch: string,
  creationError: unknown,
): GithubPullRequest {
  try {
    const existing = findOpenPullRequest(runGh, branch, baseBranch)
    if (existing !== undefined) return existing
  } catch (reconciliationError) {
    throw new PullRequestReconciliationError(creationError, reconciliationError)
  }
  throw creationError
}

function findOpenPullRequest(
  runGh: GhRunner,
  branch: string,
  baseBranch: string,
): GithubPullRequest | undefined {
  const output = runGh([
    'pr',
    'list',
    '--head',
    branch,
    '--base',
    baseBranch,
    '--state',
    'open',
    '--limit',
    '2',
    '--json',
    pullRequestFields,
  ])
  const matches = z.array(pullRequestSchema).parse(JSON.parse(output))
  if (matches.length > 1) {
    throw new PullRequestCreationOutputError(
      `Expected at most one open PR for branch ${branch}. Got multiple PRs.`,
    )
  }
  const existing = matches.at(0)
  if (existing === undefined) return undefined
  return formatPullRequest(existing, branch, baseBranch)
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

function readPullRequest(
  runGh: GhRunner,
  pullRequestReference: string,
  branch: string,
  baseBranch: string,
): GithubPullRequest {
  const rawPullRequest = runGh(['pr', 'view', pullRequestReference, '--json', pullRequestFields])
  const pullRequest = pullRequestSchema.parse(JSON.parse(rawPullRequest))
  return formatPullRequest(pullRequest, branch, baseBranch)
}

function formatPullRequest(
  pullRequest: z.infer<typeof pullRequestSchema>,
  branch: string,
  baseBranch: string,
): GithubPullRequest {
  if (pullRequest.headRefName !== branch)
    throw new PullRequestCreationOutputError(
      'Returned PR does not match the recorded feature branch.',
    )
  if (pullRequest.baseRefName !== baseBranch)
    throw new PullRequestCreationOutputError('Returned PR does not match the intended base branch.')
  const pathname = z
    .string()
    .regex(/^\/[^/]+\/[^/]+\/pull\/[1-9]\d*$/)
    .parse(new URL(pullRequest.url).pathname)
  if (!pathname.endsWith(`/pull/${String(pullRequest.number)}`))
    throw new PullRequestCreationOutputError('Returned PR URL does not match its number.')
  return {
    repository: pathname.split('/').slice(1, 3).join('/'),
    baseRevision: pullRequest.baseRefOid,
    headRevision: pullRequest.headRefOid,
    prNumber: pullRequest.number,
    prUrl: pullRequest.url,
    isDraft: pullRequest.isDraft,
  }
}
