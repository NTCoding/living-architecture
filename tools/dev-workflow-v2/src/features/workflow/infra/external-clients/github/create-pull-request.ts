import { z } from 'zod'
import type { PullRequestCreationRequest } from '../../../domain/pull-request-description'

const pullRequestSchema = z.object({
  number: z.number().int().positive(),
  url: z.string().url(),
  isDraft: z.boolean(),
})

const createPullRequestOutputSchema = z.object({url: z.string().url(),})

/** @riviere-role external-client-model */
export type CreatedPullRequest = {
  readonly prNumber: number
  readonly prUrl: string
  readonly isDraft: boolean
}

/** @riviere-role external-client-model */
export type GhRunner = (args: string) => string

/** @riviere-role external-client-error */
class PullRequestCreationOutputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PullRequestCreationOutputError'
  }
}

/** @riviere-role external-client-service */
export function createPullRequestCreator(
  runGh: GhRunner,
): (request: PullRequestCreationRequest) => CreatedPullRequest {
  return (request: PullRequestCreationRequest): CreatedPullRequest => {
    const createOutput = runGh(
      toCommandArgs([
        'pr',
        'create',
        '--title',
        request.title,
        '--body',
        request.body,
        '--json',
        'url',
      ]),
    )
    const pullRequestUrl = readPullRequestUrl(createOutput)
    return readPullRequest(runGh, pullRequestUrl)
  }
}

function toCommandArgs(args: readonly string[]): string {
  return args.map(quoteShellArg).join(' ')
}

function quoteShellArg(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`
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

function readPullRequest(runGh: GhRunner, pullRequestReference: string): CreatedPullRequest {
  const rawPullRequest = runGh(
    toCommandArgs(['pr', 'view', pullRequestReference, '--json', 'number,url,isDraft']),
  )
  const pullRequest = pullRequestSchema.parse(JSON.parse(rawPullRequest))
  return {
    prNumber: pullRequest.number,
    prUrl: pullRequest.url,
    isDraft: pullRequest.isDraft,
  }
}
