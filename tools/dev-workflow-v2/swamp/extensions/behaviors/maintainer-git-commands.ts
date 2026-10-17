import { CommitMessageRejected, InvalidIssueNumber } from './maintainer-git-errors.ts'

/**
 * Argument construction for the git and gh commands the maintainer workflow
 * runs. Nothing here touches the filesystem or spawns a process, so it can be
 * covered by ordinary tests.
 *
 * Every value that reaches a command comes from a schema validated artefact or
 * from a git read, never from free text the agent composes at the last moment.
 * The executable and each argument stay separate, so nothing in a recorded
 * value can become an extra argument.
 */

/** A command to run, with its arguments kept separate from the executable. */
export interface PlannedCommand {
  readonly executable: string
  readonly args: readonly string[]
}

const CONVENTIONAL_COMMIT =
  /^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\([a-z0-9/-]+\))?: [a-z0-9].*$/

/**
 * Returns a reason the message would make a poor commit subject, or undefined
 * when it is acceptable.
 *
 * The factory schema already enforces length and non-emptiness. This covers the
 * shape a schema cannot express, so a malformed subject is rejected before
 * `git commit` sees it.
 */
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

/** The branch name the maintainer workflow uses for an issue. */
export function branchNameForIssue(issue: number): string {
  if (!Number.isInteger(issue) || issue < 1) {
    throw new InvalidIssueNumber(String(issue))
  }
  return `dev-workflow/issue-${String(issue)}`
}

/** `git fetch` for the named remote, pruning deleted branches. */
export function planFetch(remote: string): PlannedCommand {
  return { executable: 'git', args: ['fetch', remote, '--prune'] }
}

/** `git rev-parse --verify <branch>`, to see whether a branch already exists. */
export function planCheckBranchExists(branch: string): PlannedCommand {
  return { executable: 'git', args: ['rev-parse', '--verify', branch] }
}

/** `git switch -c <branch> <startPoint>`, creating the branch from a base. */
export function planCreateBranch(branch: string, startPoint: string): PlannedCommand {
  return { executable: 'git', args: ['switch', '--create', branch, startPoint] }
}

/** `git switch <branch>` for a branch that already exists. */
export function planSwitchBranch(branch: string): PlannedCommand {
  return { executable: 'git', args: ['switch', branch] }
}

/** `git add --all`, so every change the agent made is included exactly once. */
export function planStageAll(): PlannedCommand {
  return { executable: 'git', args: ['add', '--all'] }
}

/**
 * `git commit -m <message>`.
 *
 * Throws rather than returning a command when the message would break the
 * repository's commit conventions.
 */
export function planCommit(message: string): PlannedCommand {
  const problem = commitMessageProblem(message)
  if (problem !== undefined) {
    throw new CommitMessageRejected(problem)
  }
  return { executable: 'git', args: ['commit', '--message', message] }
}

/** `git rev-parse HEAD`, to read the commit that was just created. */
export function planHeadSha(): PlannedCommand {
  return { executable: 'git', args: ['rev-parse', 'HEAD'] }
}

/** `git status --porcelain`, which is empty when the tree is clean. */
export function planStatus(): PlannedCommand {
  return { executable: 'git', args: ['status', '--porcelain'] }
}

/** `git rev-list --count <base>..HEAD`, the number of commits ahead of a base. */
export function planCommitsAhead(base: string): PlannedCommand {
  return { executable: 'git', args: ['rev-list', '--count', `${base}..HEAD`] }
}

/** `git push --set-upstream <remote> <branch>`. */
export function planPush(remote: string, branch: string): PlannedCommand {
  return { executable: 'git', args: ['push', '--set-upstream', remote, branch] }
}

/** `gh pr create` with the composed title and body. */
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

/** `gh pr comment <pr> --body <body>`. */
export function planCommentOnPullRequest(pr: number, body: string): PlannedCommand {
  return { executable: 'gh', args: ['pr', 'comment', String(pr), '--body', body] }
}

/**
 * `gh api` posting one inline review comment at a file and line.
 *
 * The endpoint takes the commit the comment applies to, so a comment always
 * names the revision that was reviewed, and `side: RIGHT` puts it on the added
 * side of the diff.
 */
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

/** `gh api` reading the reviews on a pull request. */
export function planListReviews(pr: number): PlannedCommand {
  return {
    executable: 'gh',
    args: ['api', `repos/{owner}/{repo}/pulls/${String(pr)}/reviews`],
  }
}

/** `pnpm verify`, the repository's own gate. */
export function planVerify(): PlannedCommand {
  return { executable: 'pnpm', args: ['verify'] }
}

/**
 * The pull request body, composed from recorded artefacts rather than written
 * at submit time, so it cannot drift from what was actually done.
 */
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

/**
 * The body of a single finding posted to the pull request.
 *
 * The factory's `kind: findings` contract carries an id, a severity and a
 * description, so a finding names no file or line. The comment therefore reads
 * as one item in a list, and stays honest about what was recorded.
 */
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

/** One finding as the factory records it, using its built in findings contract. */
export interface RecordedFinding {
  readonly id: string
  readonly severity: string
  readonly description: string
  readonly category?: string
}

/** Where a finding belongs on the pull request. */
export interface FindingLocation {
  readonly findingId: string
  readonly path: string
  readonly line: number
}

/** A finding that can be posted as an inline review comment. */
export interface PlacedFinding {
  readonly finding: RecordedFinding
  readonly path: string
  readonly line: number
}

/** The outcome of matching findings to locations. */
export interface PlacedFindings {
  readonly placed: readonly PlacedFinding[]
  readonly unplaced: readonly RecordedFinding[]
}

/**
 * Pairs each recorded finding with the location the reviewer gave for it.
 *
 * The factory's findings contract carries no file or line, so a reviewer
 * records locations separately and this pairs them up. A finding without a
 * location is returned separately rather than dropped, so it can still be
 * posted as a comment on the pull request instead of disappearing.
 */
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
