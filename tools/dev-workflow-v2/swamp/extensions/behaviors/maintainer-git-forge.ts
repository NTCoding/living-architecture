import {
  composeFindingComment,
  composePullRequestBody,
  placeFindings,
  planCommentOnPullRequest,
  planCreatePullRequest,
  planEditPullRequestBody,
  planHeadSha,
  planListReviews,
  planPush,
  planReviewComment,
  planViewPullRequest,
  type FindingLocation,
  type RecordedFinding,
} from './maintainer-git-commands.ts'
import { pause, resolveWorkspaceRoot, runCommand, runOrThrow } from './maintainer-git-execution.ts'
import {
  CommandFailed,
  PullRequestNotIdentified,
  ReviewerResponseUnreadable,
  ReviewerTimedOut,
  RunCancelled,
} from './maintainer-git-errors.ts'
import type { BehaviourContext, MethodResult } from './maintainer-git-schema.ts'

const REMOTE = 'origin'
const BASE = 'main'

interface Review {
  readonly login: string | undefined
  readonly state: string | undefined
  readonly commitId: string | undefined
}

interface ExistingPullRequest {
  readonly number: number
  readonly url: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function readReview(value: unknown): Review {
  if (!isRecord(value)) {
    throw new ReviewerResponseUnreadable('an entry was not an object')
  }
  const user = isRecord(value['user']) ? value['user'] : undefined
  return {
    login: asString(user?.['login']),
    state: asString(value['state']),
    commitId: asString(value['commit_id']),
  }
}

function readReviews(json: string): readonly Review[] {
  const parsed: unknown = JSON.parse(json)
  if (!Array.isArray(parsed)) {
    throw new ReviewerResponseUnreadable('the response was not a list')
  }
  return parsed.map(readReview)
}

function readExistingPullRequest(json: string): ExistingPullRequest | undefined {
  const parsed: unknown = JSON.parse(json)
  if (!isRecord(parsed)) return undefined
  const number = parsed['number']
  const url = parsed['url']
  if (typeof number !== 'number' || typeof url !== 'string') return undefined
  return { number, url }
}

function isExternalReviewer(review: Review): boolean {
  return review.login?.toLowerCase().includes('coderabbit') === true
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
  const root = await resolveWorkspaceRoot(context.signal)
  await runOrThrow(planPush(REMOTE, args.branch), context.signal, 'git push', root)
  const handle = await context.writeResource('push', 'push', {
    branch: args.branch,
    pushed: true,
  })
  context.logger.info(`pushed ${args.branch}`)
  return { dataHandles: [handle] }
}

async function upsertPullRequest(
  args: {
    branch: string
    title: string
    body: string
  },
  context: BehaviourContext,
  root: string,
): Promise<ExistingPullRequest> {
  const existing = await runCommand(planViewPullRequest(args.branch), context.signal, root)
  if (existing.exitCode === 0 && existing.stdout !== '') {
    const found = readExistingPullRequest(existing.stdout)
    if (found === undefined) {
      throw new PullRequestNotIdentified(`gh pr view returned ${existing.stdout}`)
    }
    await runOrThrow(
      planEditPullRequestBody(found.number, args.body),
      context.signal,
      'gh pr edit',
      root,
    )
    context.logger.info(`updated ${found.url}`)
    return found
  }

  const created = await runOrThrow(
    planCreatePullRequest({ base: BASE, head: args.branch, title: args.title, body: args.body }),
    context.signal,
    'gh pr create',
    root,
  )
  const url = created.stdout
    .split('\n')
    .filter((line) => line.startsWith('http'))
    .pop()
  if (url === undefined) {
    throw new PullRequestNotIdentified(`gh printed no URL: ${created.stdout}`)
  }
  context.logger.info(`opened ${url}`)
  return { number: pullRequestNumberFrom(url), url }
}

export async function openPullRequest(
  args: {
    issue: number
    branch: string
    title: string
    planSummary: string
    changeSummary: string
    commitMessage: string
    files: string[]
  },
  context: BehaviourContext,
): Promise<MethodResult> {
  const root = await resolveWorkspaceRoot(context.signal)
  const body = composePullRequestBody({
    issue: args.issue,
    planSummary: args.planSummary,
    changeSummary: args.changeSummary,
    commitMessage: args.commitMessage,
    files: args.files,
  })
  const pullRequest = await upsertPullRequest(
    { branch: args.branch, title: args.title, body },
    context,
    root,
  )
  const sha = await runOrThrow(planHeadSha(), context.signal, 'git rev-parse', root)
  const handle = await context.writeResource('pullRequest', 'pull-request', {
    number: pullRequest.number,
    url: pullRequest.url,
    headSha: sha.stdout,
  })
  return { dataHandles: [handle] }
}

export async function postComment(
  args: { pr: number; body: string },
  context: BehaviourContext,
): Promise<MethodResult> {
  const root = await resolveWorkspaceRoot(context.signal)
  await runOrThrow(
    planCommentOnPullRequest(args.pr, args.body),
    context.signal,
    'gh pr comment',
    root,
  )
  return { dataHandles: [] }
}

type Posting = 'inline' | 'general'

interface Posted {
  readonly findingId: string
  readonly posting: Posting
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
  const root = await resolveWorkspaceRoot(context.signal)
  const { placed, unplaced } = placeFindings(args.findings, args.locations)

  const comment = (finding: RecordedFinding): string =>
    composeFindingComment({
      id: finding.id,
      severity: finding.severity,
      description: finding.description,
      ...(finding.category === undefined ? {} : { category: finding.category }),
    })

  const postInline = async (entry: (typeof placed)[number]): Promise<Posted> => {
    try {
      await runOrThrow(
        planReviewComment({
          pr: args.pr,
          headSha: args.headSha,
          path: entry.path,
          line: entry.line,
          body: comment(entry.finding),
        }),
        context.signal,
        'gh api review comment',
        root,
      )
      return { findingId: entry.finding.id, posting: 'inline' }
    } catch (error) {
      if (!(error instanceof CommandFailed)) throw error
      context.logger.warn(
        `inline comment at ${entry.path}:${String(entry.line)} was rejected, posting it as a comment`,
      )
      await runOrThrow(
        planCommentOnPullRequest(
          args.pr,
          `${comment(entry.finding)}\n\n_At \`${entry.path}:${String(entry.line)}\`._`,
        ),
        context.signal,
        'gh pr comment',
        root,
      )
      return { findingId: entry.finding.id, posting: 'general' }
    }
  }

  const postGeneral = async (finding: RecordedFinding): Promise<Posted> => {
    await runOrThrow(
      planCommentOnPullRequest(args.pr, comment(finding)),
      context.signal,
      'gh pr comment',
      root,
    )
    return { findingId: finding.id, posting: 'general' }
  }

  const posted = [
    ...(await Promise.all(placed.map(postInline))),
    ...(await Promise.all(unplaced.map(postGeneral))),
  ]
  const inline = posted.filter((entry) => entry.posting === 'inline').length
  const general = posted.length - inline

  const handle = await context.writeResource('postedFindings', 'posted-findings', {
    inline,
    general,
    findingIds: posted.map((entry) => entry.findingId),
  })
  context.logger.info(`posted ${String(inline)} inline and ${String(general)} general findings`)
  return { dataHandles: [handle] }
}

export async function awaitCodeRabbit(
  args: { pr: number; headSha: string; timeoutSeconds: number; intervalSeconds: number },
  context: BehaviourContext,
): Promise<MethodResult> {
  const root = await resolveWorkspaceRoot(context.signal)
  const deadline = Date.now() + args.timeoutSeconds * 1000
  while (Date.now() < deadline) {
    if (context.signal.aborted) {
      throw new RunCancelled('the wait for the external reviewer')
    }
    const listing = await runOrThrow(
      planListReviews(args.pr),
      context.signal,
      'gh api reviews',
      root,
    )
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
    await pause(args.intervalSeconds * 1000, context.signal)
  }
  if (context.signal.aborted) {
    throw new RunCancelled('the wait for the external reviewer')
  }
  throw new ReviewerTimedOut(args.headSha, args.timeoutSeconds)
}
