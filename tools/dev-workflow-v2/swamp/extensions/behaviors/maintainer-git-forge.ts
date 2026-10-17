import {
  composeFindingComment,
  composePullRequestBody,
  placeFindings,
  planCommentOnPullRequest,
  planCreatePullRequest,
  planHeadSha,
  planListReviews,
  planPush,
  planReviewComment,
  type FindingLocation,
  type RecordedFinding,
} from './maintainer-git-commands.ts'
import { runOrThrow } from './maintainer-git-execution.ts'
import {
  PullRequestNotIdentified,
  ReviewerResponseUnreadable,
  ReviewerTimedOut,
} from './maintainer-git-errors.ts'
import type { BehaviourContext, MethodResult } from './maintainer-git-schema.ts'

const REMOTE = 'origin'
const BASE = 'main'

interface Review {
  readonly user?: { readonly login?: string }
  readonly state?: string
  readonly commitId?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readReview(value: unknown): Review {
  if (!isRecord(value)) {
    throw new ReviewerResponseUnreadable('an entry was not an object')
  }
  const user = isRecord(value['user']) ? value['user'] : undefined
  const login = user?.['login']
  const state = value['state']
  const commitId = value['commit_id']
  return {
    ...(typeof login === 'string' ? { user: { login } } : {}),
    ...(typeof state === 'string' ? { state } : {}),
    ...(typeof commitId === 'string' ? { commitId } : {}),
  }
}

function readReviews(json: string): readonly Review[] {
  const parsed: unknown = JSON.parse(json)
  if (!Array.isArray(parsed)) {
    throw new ReviewerResponseUnreadable('the response was not a list')
  }
  return parsed.map(readReview)
}

function isExternalReviewer(review: Review): boolean {
  return review.user?.login?.toLowerCase().includes('coderabbit') === true
}

function pullRequestNumberFrom(url: string): number {
  const segments = url.split('/')
  const last = segments[segments.length - 1]
  if (last === undefined) {
    throw new PullRequestNotIdentified(`no path segments in ${url}`)
  }
  const number = Number.parseInt(last, 10)
  if (!Number.isInteger(number) || number < 1) {
    throw new PullRequestNotIdentified(`no pull request number at the end of ${url}`)
  }
  return number
}

export async function pushBranch(
  args: { branch: string },
  context: BehaviourContext,
): Promise<MethodResult> {
  await runOrThrow(planPush(REMOTE, args.branch), context.signal, 'git push')
  const handle = await context.writeResource('push', 'push', {
    branch: args.branch,
    pushed: true,
  })
  context.logger.info(`pushed ${args.branch}`)
  return { dataHandles: [handle] }
}

export async function openPullRequest(
  args: {
    issue: number
    branch: string
    title: string
    changeSummary: string
    commitMessage: string
    files: string[]
  },
  context: BehaviourContext,
): Promise<MethodResult> {
  const body = composePullRequestBody({
    issue: args.issue,
    changeSummary: args.changeSummary,
    commitMessage: args.commitMessage,
    files: args.files,
  })
  const outcome = await runOrThrow(
    planCreatePullRequest({ base: BASE, head: args.branch, title: args.title, body }),
    context.signal,
    'gh pr create',
  )
  const url = outcome.stdout
    .split('\n')
    .filter((line) => line.startsWith('http'))
    .pop()
  if (url === undefined) {
    throw new PullRequestNotIdentified(`gh printed no URL: ${outcome.stdout}`)
  }
  const number = pullRequestNumberFrom(url)
  const sha = await runOrThrow(planHeadSha(), context.signal, 'git rev-parse')
  const handle = await context.writeResource('pullRequest', 'pull-request', {
    number,
    url,
    headSha: sha.stdout,
  })
  context.logger.info(`opened ${url}`)
  return { dataHandles: [handle] }
}

export async function postComment(
  args: { pr: number; body: string },
  context: BehaviourContext,
): Promise<MethodResult> {
  await runOrThrow(planCommentOnPullRequest(args.pr, args.body), context.signal, 'gh pr comment')
  return { dataHandles: [] }
}

export async function postFindings(
  args: {
    pr: number
    headSha: string
    findings: readonly RecordedFinding[]
    locations: readonly FindingLocation[]
  },
  context: BehaviourContext,
): Promise<MethodResult> {
  const { placed, unplaced } = placeFindings(args.findings, args.locations)
  const posted: string[] = []

  for (const entry of placed) {
    const body = composeFindingComment({
      id: entry.finding.id,
      severity: entry.finding.severity,
      description: entry.finding.description,
      ...(entry.finding.category === undefined ? {} : { category: entry.finding.category }),
    })
    await runOrThrow(
      planReviewComment({
        pr: args.pr,
        headSha: args.headSha,
        path: entry.path,
        line: entry.line,
        body,
      }),
      context.signal,
      'gh api review comment',
    )
    posted.push(entry.finding.id)
  }

  for (const finding of unplaced) {
    const body = composeFindingComment({
      id: finding.id,
      severity: finding.severity,
      description: finding.description,
      ...(finding.category === undefined ? {} : { category: finding.category }),
    })
    await runOrThrow(planCommentOnPullRequest(args.pr, body), context.signal, 'gh pr comment')
    posted.push(finding.id)
  }

  const handle = await context.writeResource('postedFindings', 'posted-findings', {
    inline: placed.length,
    general: unplaced.length,
    findingIds: posted,
  })
  context.logger.info(
    `posted ${String(placed.length)} inline and ${String(unplaced.length)} general findings`,
  )
  return { dataHandles: [handle] }
}

export async function awaitCodeRabbit(
  args: { pr: number; headSha: string; timeoutSeconds: number; intervalSeconds: number },
  context: BehaviourContext,
): Promise<MethodResult> {
  const deadline = Date.now() + args.timeoutSeconds * 1000
  while (Date.now() < deadline) {
    if (context.signal.aborted) {
      throw new ReviewerTimedOut(args.headSha, args.timeoutSeconds)
    }
    const listing = await runOrThrow(planListReviews(args.pr), context.signal, 'gh api reviews')
    const match = readReviews(listing.stdout).find(
      (review) => isExternalReviewer(review) && review.commitId === args.headSha,
    )
    if (match !== undefined) {
      const state = match.state ?? 'unknown'
      const handle = await context.writeResource('coderabbit', 'coderabbit', {
        reviewedSha: args.headSha,
        state,
        reviewed: true,
      })
      context.logger.info(`external reviewer finished with state ${state}`)
      return { dataHandles: [handle] }
    }
    await new Promise((resolve) => setTimeout(resolve, args.intervalSeconds * 1000))
  }
  throw new ReviewerTimedOut(args.headSha, args.timeoutSeconds)
}
