import { z } from 'zod'

const pullRequestSchema = z.object({
  number: z.number().int().positive(),
  url: z.string().url(),
  isDraft: z.boolean(),
})

/** @riviere-role external-client-model */
export type CreatedPullRequest = {
  readonly prNumber: number
  readonly prUrl: string
  readonly isDraft: boolean
}

/** @riviere-role external-client-model */
export type GhRunner = (args: string) => string

/** @riviere-role external-client-error */
class PullRequestCreationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PullRequestCreationError'
  }
}

/** @riviere-role external-client-service */
export function createPullRequestCreator(
  runGh: GhRunner,
): (args: readonly string[]) => CreatedPullRequest {
  return (args: readonly string[]): CreatedPullRequest => {
    const createOutput = runGh(toCommandArgs(['pr', 'create', ...args]))
    const pullRequestReference = readPullRequestReference(createOutput)
    const createdPullRequest = readPullRequest(runGh, pullRequestReference)
    if (!createdPullRequest.isDraft) return createdPullRequest

    runGh(toCommandArgs(['pr', 'ready', String(createdPullRequest.prNumber)]))
    const readyPullRequest = readPullRequest(runGh, String(createdPullRequest.prNumber))
    if (readyPullRequest.isDraft) {
      throw new PullRequestCreationError(
        `Expected PR #${readyPullRequest.prNumber} to be ready for review. Got draft PR.`,
      )
    }
    return readyPullRequest
  }
}

function toCommandArgs(args: readonly string[]): string {
  return args.map(quoteShellArg).join(' ')
}

function quoteShellArg(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`
}

function readPullRequestReference(createOutput: string): string {
  const trimmedOutput = createOutput.trim()
  if (trimmedOutput.length === 0) {
    throw new PullRequestCreationError(
      'Expected gh pr create to print a pull request URL. Got empty output.',
    )
  }

  const lastSpaceIndex = trimmedOutput.lastIndexOf(' ')
  const lastNewlineIndex = trimmedOutput.lastIndexOf('\n')
  const lastTabIndex = trimmedOutput.lastIndexOf('\t')
  const referenceStartIndex = Math.max(lastSpaceIndex, lastNewlineIndex, lastTabIndex) + 1
  return z.string().parse(trimmedOutput.slice(referenceStartIndex))
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
