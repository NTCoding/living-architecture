import { CommitMessageRejected, InvalidIssueNumber } from './maintainer-git-errors.ts'

export interface PlannedCommand {
  readonly executable: string
  readonly args: readonly string[]
}

const CONVENTIONAL_COMMIT =
  /^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\([a-z0-9/-]+\))?: [a-z0-9].*$/

export function commitMessageProblem(message: string): string | undefined {
  if (message !== message.trim()) {
    return 'commit message has leading or trailing whitespace'
  }
  if (message.endsWith('.')) {
    return 'commit message must not end with a full stop'
  }
  if (!CONVENTIONAL_COMMIT.test(message)) {
    return 'commit message must be a conventional commit, for example "feat(swamp): add maintainer factory"'
  }
  return undefined
}

export function parseIssueNumber(value: string): number {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new InvalidIssueNumber(value)
  }
  return Number.parseInt(value, 10)
}

export function branchNameForIssue(issue: number): string {
  if (!Number.isInteger(issue) || issue < 1) {
    throw new InvalidIssueNumber(String(issue))
  }
  return `dev-workflow/issue-${String(issue)}`
}

export function planFetch(remote: string): PlannedCommand {
  return { executable: 'git', args: ['fetch', remote, '--prune'] }
}

export function planCheckBranchExists(branch: string): PlannedCommand {
  return { executable: 'git', args: ['rev-parse', '--verify', branch] }
}

export function planCreateBranch(branch: string, startPoint: string): PlannedCommand {
  return { executable: 'git', args: ['switch', '--create', branch, startPoint] }
}

export function planSwitchBranch(branch: string): PlannedCommand {
  return { executable: 'git', args: ['switch', branch] }
}

export function planStageAll(): PlannedCommand {
  return { executable: 'git', args: ['add', '--all'] }
}

export function planCommit(message: string): PlannedCommand {
  const problem = commitMessageProblem(message)
  if (problem !== undefined) {
    throw new CommitMessageRejected(problem)
  }
  return { executable: 'git', args: ['commit', '--message', message] }
}

export function planHeadSha(): PlannedCommand {
  return { executable: 'git', args: ['rev-parse', 'HEAD'] }
}

export function planStatus(): PlannedCommand {
  return { executable: 'git', args: ['status', '--porcelain'] }
}

export function planCommitsAhead(base: string): PlannedCommand {
  return { executable: 'git', args: ['rev-list', '--count', `${base}..HEAD`] }
}

export function planPush(remote: string, branch: string): PlannedCommand {
  return { executable: 'git', args: ['push', '--set-upstream', remote, branch] }
}

export function planCreatePullRequest(options: {
  readonly base: string
  readonly head: string
  readonly title: string
  readonly body: string
}): PlannedCommand {
  return {
    executable: 'gh',
    args: [
      'pr',
      'create',
      '--base',
      options.base,
      '--head',
      options.head,
      '--title',
      options.title,
      '--body',
      options.body,
    ],
  }
}

export function planCommentOnPullRequest(pr: number, body: string): PlannedCommand {
  return { executable: 'gh', args: ['pr', 'comment', String(pr), '--body', body] }
}

export function planReviewComment(options: {
  readonly pr: number
  readonly headSha: string
  readonly path: string
  readonly line: number
  readonly body: string
}): PlannedCommand {
  return {
    executable: 'gh',
    args: [
      'api',
      '--method',
      'POST',
      `repos/{owner}/{repo}/pulls/${String(options.pr)}/comments`,
      '--raw-field',
      `commit_id=${options.headSha}`,
      '--raw-field',
      `path=${options.path}`,
      '--field',
      `line=${String(options.line)}`,
      '--raw-field',
      'side=RIGHT',
      '--raw-field',
      `body=${options.body}`,
    ],
  }
}

export function planListReviews(pr: number): PlannedCommand {
  return {
    executable: 'gh',
    args: ['api', `repos/{owner}/{repo}/pulls/${String(pr)}/reviews`],
  }
}

export function planVerify(): PlannedCommand {
  return { executable: 'pnpm', args: ['verify'] }
}

export function composePullRequestBody(options: {
  readonly issue: number
  readonly planSummary: string
  readonly changeSummary: string
  readonly commitMessage: string
  readonly files: readonly string[]
}): string {
  const files = options.files.map((file) => `- \`${file}\``).join('\n')
  return [
    `Closes #${String(options.issue)}.`,
    '',
    '## Problem',
    '',
    options.planSummary,
    '',
    '## Change',
    '',
    options.changeSummary,
    '',
    `**Commit:** \`${options.commitMessage}\``,
    '',
    '### Files',
    '',
    files,
    '',
    '## Validation',
    '',
    '`pnpm verify` passed. Produced by the maintainer workflow; see the run',
    'record for the review findings and their resolutions.',
    '',
  ].join('\n')
}

export function composeFindingComment(finding: {
  readonly id: string
  readonly severity: string
  readonly description: string
  readonly category?: string
}): string {
  const parts =
    finding.category === undefined
      ? [`**${finding.severity}**`, `\`${finding.id}\``]
      : [`**${finding.severity}**`, finding.category, `\`${finding.id}\``]
  return [parts.join(' \u00b7 '), '', finding.description].join('\n')
}

export interface RecordedFinding {
  readonly id: string
  readonly severity: string
  readonly description: string
  readonly category?: string
}

export interface FindingLocation {
  readonly findingId: string
  readonly path: string
  readonly line: number
}

export interface PlacedFinding {
  readonly finding: RecordedFinding
  readonly path: string
  readonly line: number
}

export interface PlacedFindings {
  readonly placed: readonly PlacedFinding[]
  readonly unplaced: readonly RecordedFinding[]
}

export function placeFindings(
  findings: readonly RecordedFinding[],
  locations: readonly FindingLocation[],
): PlacedFindings {
  const byId = new Map(locations.map((location) => [location.findingId, location]))
  const placed: PlacedFinding[] = []
  const unplaced: RecordedFinding[] = []
  for (const finding of findings) {
    const location = byId.get(finding.id)
    if (location === undefined) {
      unplaced.push(finding)
    } else {
      placed.push({ finding, path: location.path, line: location.line })
    }
  }
  return { placed, unplaced }
}
