import { describe, expect, it } from 'vitest'
import {
  CommandFailed,
  CommitMessageRejected,
  InvalidIssueNumber,
  RunCancelled,
} from './maintainer-git-errors'
import {
  branchNameForIssue,
  commitMessageProblem,
  composeFindingComment,
  composePullRequestBody,
  planCheckBranchExists,
  planCommentOnPullRequest,
  planCommit,
  planCommitsAhead,
  planCreateBranch,
  planCreatePullRequest,
  planFetch,
  planHeadSha,
  placeFindings,
  planListReviews,
  planPush,
  planReviewComment,
  planStageAll,
  planStatus,
  planSwitchBranch,
  parseIssueNumber,
  planVerify,
} from './maintainer-git-commands'

describe('commitMessageProblem', () => {
  it('returns undefined for a conventional commit', () => {
    expect(commitMessageProblem('feat(swamp): add maintainer factory')).toBeUndefined()
  })

  it('returns undefined for a conventional commit without a scope', () => {
    expect(commitMessageProblem('fix: handle empty finding list')).toBeUndefined()
  })

  it('names the missing type when the message is plain prose', () => {
    expect(commitMessageProblem('add the maintainer factory')).toBe(
      'commit message must be a conventional commit, for example "feat(swamp): add maintainer factory"',
    )
  })

  it('names the trailing full stop when the message ends with one', () => {
    expect(commitMessageProblem('feat: add a thing.')).toBe(
      'commit message must not end with a full stop',
    )
  })

  it('names the whitespace when the message is padded', () => {
    expect(commitMessageProblem(' feat: add a thing')).toBe(
      'commit message has leading or trailing whitespace',
    )
  })

  it('rejects an upper case description after the type', () => {
    expect(commitMessageProblem('feat: Add a thing')).toContain('conventional commit')
  })

  it('rejects a bare type with no description', () => {
    expect(commitMessageProblem('feat:')).toContain('conventional commit')
  })
})

describe('branchNameForIssue', () => {
  it('builds a branch name from the issue number', () => {
    expect(branchNameForIssue(123)).toBe('dev-workflow/issue-123')
  })

  it('throws InvalidIssueNumber when the issue number is zero', () => {
    expect(() => branchNameForIssue(0)).toThrow(new InvalidIssueNumber('0'))
  })

  it('throws InvalidIssueNumber when the issue number is fractional', () => {
    expect(() => branchNameForIssue(1.5)).toThrow(InvalidIssueNumber)
  })
})

describe('parseIssueNumber', () => {
  it('reads a numeric work item as a number', () => {
    expect(parseIssueNumber('999')).toBe(999)
  })

  it('rejects a work item that is not a number', () => {
    expect(() => parseIssueNumber('PAY-218')).toThrow(InvalidIssueNumber)
  })

  it('rejects a work item with leading zeros', () => {
    expect(() => parseIssueNumber('0999')).toThrow(InvalidIssueNumber)
  })

  it('rejects an empty work item', () => {
    expect(() => parseIssueNumber('')).toThrow(InvalidIssueNumber)
  })
})

describe('planCommit', () => {
  it('passes the message as a single argument so it cannot be split', () => {
    expect(planCommit('feat: add a thing')).toStrictEqual({
      executable: 'git',
      args: ['commit', '--message', 'feat: add a thing'],
    })
  })

  it('keeps shell metacharacters inside one argument', () => {
    expect(planCommit('fix: handle `$(rm -rf /)` in input').args[2]).toBe(
      'fix: handle `$(rm -rf /)` in input',
    )
  })

  it('throws CommitMessageRejected instead of planning git when the message is not conventional', () => {
    expect(() => planCommit('add a thing')).toThrow(CommitMessageRejected)
  })
})

describe('composeFindingComment', () => {
  it('leads with the severity and the finding id', () => {
    expect(
      composeFindingComment({ id: 'f-1', severity: 'critical', description: 'Missing guard.' }),
    ).toBe('**critical** \u00b7 `f-1`\n\nMissing guard.')
  })

  it('includes the category when one was recorded', () => {
    expect(
      composeFindingComment({
        id: 'f-2',
        severity: 'low',
        description: 'Naming.',
        category: 'conventions',
      }),
    ).toBe('**low** \u00b7 conventions \u00b7 `f-2`\n\nNaming.')
  })
})

describe('composePullRequestBody', () => {
  it('states the issue the change closes', () => {
    const body = composePullRequestBody({
      issue: 123,
      planSummary: 'Add a factory.',
      changeSummary: 'Added the factory.',
      commitMessage: 'feat(swamp): add factory',
      files: [],
    })
    expect(body).toContain('Closes #123.')
  })

  it('carries the recorded plan and change summaries verbatim', () => {
    const body = composePullRequestBody({
      issue: 7,
      planSummary: 'Step one.\nStep two.',
      changeSummary: 'Added the behaviour.',
      commitMessage: 'feat: add behaviour',
      files: [],
    })
    expect(body).toContain('Step one.\nStep two.')
    expect(body).toContain('Added the behaviour.')
  })

  it('lists every changed file', () => {
    const body = composePullRequestBody({
      issue: 7,
      planSummary: 'Plan.',
      changeSummary: 'Change.',
      commitMessage: 'feat: add behaviour',
      files: ['a.ts', 'b.ts'],
    })
    expect(body).toContain('- `a.ts`\n- `b.ts`')
  })

  it('names the commit that was made', () => {
    const body = composePullRequestBody({
      issue: 7,
      planSummary: 'Plan.',
      changeSummary: 'Change.',
      commitMessage: 'feat: add behaviour',
      files: [],
    })
    expect(body).toContain('**Commit:** `feat: add behaviour`')
  })
})

describe('placeFindings', () => {
  const finding = (id: string) => ({ id, severity: 'high', description: `${id} detail` })

  it('pairs each finding with the location the reviewer gave', () => {
    const { placed } = placeFindings(
      [finding('f-1')],
      [{ findingId: 'f-1', path: 'src/main.ts', line: 12 }],
    )
    expect(placed).toStrictEqual([{ finding: finding('f-1'), path: 'src/main.ts', line: 12 }])
  })

  it('returns a finding with no location separately rather than dropping it', () => {
    const { placed, unplaced } = placeFindings([finding('f-1')], [])
    expect(placed).toStrictEqual([])
    expect(unplaced).toStrictEqual([finding('f-1')])
  })

  it('ignores a location for a finding that was not recorded', () => {
    const { placed, unplaced } = placeFindings(
      [finding('f-1')],
      [{ findingId: 'f-9', path: 'src/other.ts', line: 3 }],
    )
    expect(placed).toStrictEqual([])
    expect(unplaced).toStrictEqual([finding('f-1')])
  })
})

describe('planReviewComment', () => {
  it('posts to the pull request comments endpoint on the added side', () => {
    expect(
      planReviewComment({
        pr: 12,
        headSha: 'abc1234',
        path: 'src/main.ts',
        line: 42,
        body: '**high**',
      }).args,
    ).toStrictEqual([
      'api',
      '--method',
      'POST',
      'repos/{owner}/{repo}/pulls/12/comments',
      '--raw-field',
      'commit_id=abc1234',
      '--raw-field',
      'path=src/main.ts',
      '--field',
      'line=42',
      '--raw-field',
      'side=RIGHT',
      '--raw-field',
      'body=**high**',
    ])
  })
})

describe('simple command plans', () => {
  it('fetches the remote with pruning', () => {
    expect(planFetch('origin')).toStrictEqual({
      executable: 'git',
      args: ['fetch', 'origin', '--prune'],
    })
  })

  it('checks whether a branch exists', () => {
    expect(planCheckBranchExists('dev-workflow/issue-1')).toStrictEqual({
      executable: 'git',
      args: ['rev-parse', '--verify', 'dev-workflow/issue-1'],
    })
  })

  it('creates a branch from a start point', () => {
    expect(planCreateBranch('dev-workflow/issue-1', 'origin/main')).toStrictEqual({
      executable: 'git',
      args: ['switch', '--create', 'dev-workflow/issue-1', 'origin/main'],
    })
  })

  it('switches to an existing branch', () => {
    expect(planSwitchBranch('dev-workflow/issue-1')).toStrictEqual({
      executable: 'git',
      args: ['switch', 'dev-workflow/issue-1'],
    })
  })

  it('stages every change', () => {
    expect(planStageAll()).toStrictEqual({ executable: 'git', args: ['add', '--all'] })
  })

  it('reads the head commit', () => {
    expect(planHeadSha()).toStrictEqual({ executable: 'git', args: ['rev-parse', 'HEAD'] })
  })

  it('reads the working tree status', () => {
    expect(planStatus()).toStrictEqual({ executable: 'git', args: ['status', '--porcelain'] })
  })

  it('counts commits ahead of a base', () => {
    expect(planCommitsAhead('origin/main')).toStrictEqual({
      executable: 'git',
      args: ['rev-list', '--count', 'origin/main..HEAD'],
    })
  })

  it('pushes and sets the upstream', () => {
    expect(planPush('origin', 'dev-workflow/issue-1')).toStrictEqual({
      executable: 'git',
      args: ['push', '--set-upstream', 'origin', 'dev-workflow/issue-1'],
    })
  })

  it('creates a pull request with the body as one argument', () => {
    expect(
      planCreatePullRequest({
        base: 'main',
        head: 'dev-workflow/issue-1',
        title: 'feat: add a thing',
        body: 'Closes #1.',
      }).args,
    ).toStrictEqual([
      'pr',
      'create',
      '--base',
      'main',
      '--head',
      'dev-workflow/issue-1',
      '--title',
      'feat: add a thing',
      '--body',
      'Closes #1.',
    ])
  })

  it('comments on a pull request with the body as one argument', () => {
    expect(planCommentOnPullRequest(12, 'Looked at.')).toStrictEqual({
      executable: 'gh',
      args: ['pr', 'comment', '12', '--body', 'Looked at.'],
    })
  })

  it('lists reviews for a pull request', () => {
    expect(planListReviews(12).args).toStrictEqual(['api', 'repos/{owner}/{repo}/pulls/12/reviews'])
  })

  it('runs the repository verify gate', () => {
    expect(planVerify()).toStrictEqual({ executable: 'pnpm', args: ['verify'] })
  })
})

describe('error classes', () => {
  it('names the action and exit code when a command fails', () => {
    expect(new CommandFailed('git push', 128, 'no upstream').message).toBe(
      'git push failed with exit code 128: no upstream',
    )
  })

  it('names what was cancelled when a run is cancelled', () => {
    expect(new RunCancelled('gh pr create').message).toBe(
      'gh pr create was not completed because the run was cancelled',
    )
  })
})
