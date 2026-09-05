import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ImplementationBranchPreparationError } from '@living-architecture/dev-workflow-v2-domain-model/domain/implementation-branch-preparation'
import { afterEach, describe, expect, it } from 'vitest'
import {
  createGitBranchClient,
  type GitProcessResult,
} from '../../../infra/external-clients/git/git-branch-client'
import { createImplementationBranchWorkspace } from '../adapters/git/implementation-branch-workspace'
import { PrepareImplementationBranch } from './prepare-implementation-branch'

type GitRepositoryFixture = {
  readonly primary: string
  readonly remote: string
  readonly source: string
}

const temporaryDirectories: string[] = []

class GitTestProcessError extends Error {
  constructor() {
    super('Expected Git test process to start.')
    this.name = 'GitTestProcessError'
  }
}

function createTemporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'implementation-branch-'))
  temporaryDirectories.push(directory)
  return directory
}

function gitTestEnvironment(workingDirectory: string): NodeJS.ProcessEnv {
  return {
    ...Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_'))),
    GIT_CONFIG_NOSYSTEM: '1',
    HOME: workingDirectory,
  }
}

function runGit(workingDirectory: string, gitArguments: readonly string[]): string {
  return execFileSync('/usr/bin/git', gitArguments, {
    cwd: workingDirectory,
    encoding: 'utf8',
    env: gitTestEnvironment(workingDirectory),
  }).trim()
}

function executeGit(
  gitBinary: string,
  workingDirectory: string,
  gitArguments: readonly string[],
): GitProcessResult {
  const result = spawnSync(gitBinary, gitArguments, {
    cwd: workingDirectory,
    encoding: 'utf8',
    env: gitTestEnvironment(workingDirectory),
  })
  if (result.status === null) {
    throw new GitTestProcessError()
  }
  return {
    exitCode: result.status,
    stderr: result.stderr,
    stdout: result.stdout,
  }
}

function commitFile(repository: string, filename: string, content: string): string {
  writeFileSync(join(repository, filename), content)
  runGit(repository, ['add', filename])
  runGit(repository, ['commit', '-m', `add ${filename}`])
  return runGit(repository, ['rev-parse', 'HEAD'])
}

function createRepository(): GitRepositoryFixture {
  const root = createTemporaryDirectory()
  const remote = join(root, 'remote.git')
  const source = join(root, 'source')
  const primary = join(root, 'primary')
  mkdirSync(remote)
  runGit(remote, ['init', '--bare', '--initial-branch=trunk'])
  runGit(root, ['clone', remote, source])
  runGit(source, ['config', 'user.email', 'tests@example.com'])
  runGit(source, ['config', 'user.name', 'Branch Tests'])
  commitFile(source, 'initial.txt', 'initial')
  runGit(source, ['push', '--set-upstream', 'origin', 'trunk'])
  runGit(root, ['clone', remote, primary])
  runGit(primary, ['config', 'user.email', 'tests@example.com'])
  runGit(primary, ['config', 'user.name', 'Branch Tests'])
  return { primary, remote, source }
}

function prepare(repository: string, targetBranch = 'issue-42-example') {
  const git = createGitBranchClient(repository, executeGit, '/usr/bin/git')
  const workspace = createImplementationBranchWorkspace(git)
  return new PrepareImplementationBranch(workspace).execute({ targetBranch })
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

describe('PrepareImplementationBranch with Git', () => {
  it('creates the target from the refreshed remote default without moving local trunk', () => {
    const repository = createRepository()
    const localTrunkBefore = runGit(repository.primary, ['rev-parse', 'trunk'])
    const refreshedCommit = commitFile(repository.source, 'remote.txt', 'remote')
    runGit(repository.source, ['push'])

    const git = createGitBranchClient(repository.primary)
    const workspace = createImplementationBranchWorkspace(git)
    const result = new PrepareImplementationBranch(workspace).execute({
      targetBranch: 'issue-42-example',
    })

    expect({
      result,
      currentBranch: runGit(repository.primary, ['rev-parse', '--abbrev-ref', 'HEAD']),
      headCommit: runGit(repository.primary, ['rev-parse', 'HEAD']),
      localTrunk: runGit(repository.primary, ['rev-parse', 'trunk']),
      upstream: runGit(repository.primary, [
        'for-each-ref',
        '--format=%(upstream:short)',
        'refs/heads/issue-42-example',
      ]),
    }).toStrictEqual({
      result: {
        branch: 'issue-42-example',
        remoteDefaultBranch: 'origin/trunk',
        type: 'created',
      },
      currentBranch: 'issue-42-example',
      headCommit: refreshedCommit,
      localTrunk: localTrunkBefore,
      upstream: '',
    })
  })

  it('creates the target without renaming a linked worktree branch', () => {
    const repository = createRepository()
    const linkedWorktree = join(createTemporaryDirectory(), 'linked')
    runGit(repository.primary, [
      'worktree',
      'add',
      '-b',
      'automatic-worktree-branch',
      linkedWorktree,
      'origin/trunk',
    ])
    const automaticBranchCommit = runGit(repository.primary, [
      'rev-parse',
      'automatic-worktree-branch',
    ])

    expect(prepare(linkedWorktree).type).toBe('created')
    expect(runGit(linkedWorktree, ['rev-parse', '--abbrev-ref', 'HEAD'])).toBe('issue-42-example')
    expect(runGit(repository.primary, ['rev-parse', 'automatic-worktree-branch'])).toBe(
      automaticBranchCommit,
    )
  })

  it('keeps an exact target which is already current and removes its default upstream', () => {
    const repository = createRepository()
    runGit(repository.primary, [
      'switch',
      '--track',
      '--create',
      'issue-42-example',
      'origin/trunk',
    ])

    const nestedWorkingDirectory = join(repository.primary, 'tools', 'dev-workflow-v2')
    mkdirSync(nestedWorkingDirectory, { recursive: true })

    expect(prepare(nestedWorkingDirectory).type).toBe('already-current')
    expect(
      runGit(repository.primary, [
        'for-each-ref',
        '--format=%(upstream:short)',
        'refs/heads/issue-42-example',
      ]),
    ).toBe('')
  })

  it('selects an exact existing target without adding an upstream', () => {
    const repository = createRepository()
    runGit(repository.primary, ['branch', 'issue-42-example', 'trunk'])

    expect(prepare(repository.primary)).toMatchObject({ type: 'selected' })
    expect(runGit(repository.primary, ['rev-parse', '--abbrev-ref', 'HEAD'])).toBe(
      'issue-42-example',
    )
  })

  it('rejects a dirty checkout without changing branches', () => {
    const repository = createRepository()
    writeFileSync(join(repository.primary, 'dirty.txt'), 'dirty')

    expect(() => prepare(repository.primary)).toThrow(
      expect.objectContaining({ reason: 'dirty-checkout' }),
    )
    expect(runGit(repository.primary, ['rev-parse', '--abbrev-ref', 'HEAD'])).toBe('trunk')
  })

  it('rejects a detached checkout', () => {
    const repository = createRepository()
    runGit(repository.primary, ['switch', '--detach'])

    expect(() => prepare(repository.primary)).toThrow(
      expect.objectContaining({ reason: 'detached-head' }),
    )
  })

  it('rejects the remote default as the target without removing its upstream', () => {
    const repository = createRepository()

    expect(() => prepare(repository.primary, 'trunk')).toThrow(
      expect.objectContaining({ reason: 'target-branch-is-default' }),
    )
    expect(runGit(repository.primary, ['rev-parse', '--abbrev-ref', 'HEAD'])).toBe('trunk')
    expect(runGit(repository.primary, ['rev-parse', '--abbrev-ref', '@{upstream}'])).toBe(
      'origin/trunk',
    )
  })

  it('rejects an already-current target containing implementation commits', () => {
    const repository = createRepository()
    runGit(repository.primary, ['switch', '--create', 'issue-42-example', 'origin/trunk'])
    commitFile(repository.primary, 'implementation.txt', 'implementation')

    expect(() => prepare(repository.primary)).toThrow(
      expect.objectContaining({ reason: 'target-branch-has-commits' }),
    )
  })

  it('rejects an already-current exact target when its remote contains implementation commits', () => {
    const repository = createRepository()
    runGit(repository.source, ['switch', '--create', 'issue-42-example', 'trunk'])
    commitFile(repository.source, 'implementation.txt', 'implementation')
    runGit(repository.source, ['push', 'origin', 'issue-42-example'])
    runGit(repository.primary, [
      'switch',
      '--no-track',
      '--create',
      'issue-42-example',
      'origin/trunk',
    ])

    expect(() => prepare(repository.primary)).toThrow(
      expect.objectContaining({ reason: 'target-branch-has-commits' }),
    )
  })

  it('rejects an existing target behind the refreshed remote default', () => {
    const repository = createRepository()
    runGit(repository.primary, ['branch', 'issue-42-example', 'origin/trunk'])
    commitFile(repository.source, 'remote.txt', 'remote')
    runGit(repository.source, ['push'])

    expect(() => prepare(repository.primary)).toThrow(
      expect.objectContaining({ reason: 'target-branch-is-stale' }),
    )
  })

  it('rejects an existing target which diverged from the refreshed remote default', () => {
    const repository = createRepository()
    runGit(repository.primary, ['switch', '--create', 'issue-42-example', 'origin/trunk'])
    commitFile(repository.primary, 'implementation.txt', 'implementation')
    runGit(repository.primary, ['switch', 'trunk'])
    commitFile(repository.source, 'remote.txt', 'remote')
    runGit(repository.source, ['push'])

    expect(() => prepare(repository.primary)).toThrow(
      expect.objectContaining({ reason: 'target-branch-is-divergent' }),
    )
  })

  it('rejects a remote-only target containing implementation commits', () => {
    const repository = createRepository()
    runGit(repository.source, ['switch', '--create', 'issue-42-example', 'trunk'])
    commitFile(repository.source, 'implementation.txt', 'implementation')
    runGit(repository.source, ['push', 'origin', 'issue-42-example'])

    expect(() => prepare(repository.primary)).toThrow(
      expect.objectContaining({ reason: 'target-branch-has-commits' }),
    )
    expect(runGit(repository.primary, ['branch', '--list', 'issue-42-example'])).toBe('')
  })

  it('creates a remote-only target without tracking when it matches the remote default', () => {
    const repository = createRepository()
    runGit(repository.source, ['push', 'origin', 'trunk:issue-42-example'])

    expect(prepare(repository.primary)).toMatchObject({ type: 'created' })
    expect(
      runGit(repository.primary, [
        'for-each-ref',
        '--format=%(upstream:short)',
        'refs/heads/issue-42-example',
      ]),
    ).toBe('')
  })

  it('updates local remote HEAD when the server default branch changes', () => {
    const repository = createRepository()
    runGit(repository.source, ['branch', 'main', 'trunk'])
    runGit(repository.source, ['push', 'origin', 'main'])
    runGit(repository.remote, ['symbolic-ref', 'HEAD', 'refs/heads/main'])

    expect(prepare(repository.primary)).toMatchObject({ remoteDefaultBranch: 'origin/main' })
    expect(
      runGit(repository.primary, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']),
    ).toBe('origin/main')
  })

  it('rejects a target checked out in another worktree', () => {
    const repository = createRepository()
    const linkedWorktree = join(createTemporaryDirectory(), 'linked')
    runGit(repository.primary, [
      'worktree',
      'add',
      '-b',
      'issue-42-example',
      linkedWorktree,
      'origin/trunk',
    ])

    expect(() => prepare(repository.primary)).toThrow(
      expect.objectContaining({ reason: 'target-branch-is-in-another-worktree' }),
    )
  })

  it('reports an execution failure when the working directory does not exist', () => {
    const missingDirectory = join(createTemporaryDirectory(), 'missing')
    const git = createGitBranchClient(missingDirectory)
    const workspace = createImplementationBranchWorkspace(git)
    const command = new PrepareImplementationBranch(workspace)

    expect(() => command.execute({ targetBranch: 'issue-42-example' })).toThrow(
      /Git command failed: git check-ref-format --branch issue-42-example.*ENOENT/,
    )
  })

  it('reports invalid Git branch names before inspecting the checkout', () => {
    const repository = createRepository()

    expect(() => prepare(repository.primary, 'invalid branch')).toThrow(
      /check-ref-format --branch invalid branch/,
    )
  })

  it('uses the domain preparation error for unsafe branch state', () => {
    const repository = createRepository()
    commitFile(repository.primary, 'local.txt', 'local')

    expect(() => prepare(repository.primary)).toThrow(ImplementationBranchPreparationError)
  })
})
