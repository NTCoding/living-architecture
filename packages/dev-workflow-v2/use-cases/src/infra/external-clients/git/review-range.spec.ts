import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createReviewRangeReader } from './review-range'

const temporaryDirectories: string[] = []

function createTemporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'review-range-'))
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

function commit(workingDirectory: string, message: string, contents: string): string {
  writeFileSync(join(workingDirectory, 'file.txt'), contents)
  runGit(workingDirectory, ['add', 'file.txt'])
  runGit(workingDirectory, ['commit', '-m', message])
  return runGit(workingDirectory, ['rev-parse', 'HEAD'])
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true })
})

describe('createReviewRangeReader', () => {
  it('uses merge base for the first review cycle', () => {
    const executeGit = (argumentsList: readonly string[]) =>
      argumentsList[0] === 'merge-base' && argumentsList[1] !== '--is-ancestor' ? 'base' : ''

    expect(createReviewRangeReader(executeGit)('main', 'head', undefined)).toBe('base..head')
  })

  it('uses the previous reviewed commit for a later review cycle', () => {
    const calls: string[][] = []
    const executeGit = (argumentsList: readonly string[]) => {
      calls.push([...argumentsList])
      return ''
    }

    expect(createReviewRangeReader(executeGit)('main', 'head', 'reviewed')).toBe('reviewed..head')
    expect(calls).toStrictEqual([['merge-base', '--is-ancestor', 'reviewed', 'head']])
  })

  it('rejects a review range whose base is not an ancestor of its head', () => {
    expect(() => createReviewRangeReader(() => 'failure')('main', 'head', 'reviewed')).toThrow(
      'Review range base reviewed is not an ancestor of head.',
    )
  })

  it('computes real ranges through the default git command runner', () => {
    const workingDirectory = createTemporaryDirectory()
    const originalDirectory = process.cwd()
    process.chdir(workingDirectory)
    try {
      runGit(workingDirectory, ['init', '-b', 'main'])
      runGit(workingDirectory, ['config', 'user.email', 'test@example.com'])
      runGit(workingDirectory, ['config', 'user.name', 'Test'])
      const base = commit(workingDirectory, 'base', 'one')
      runGit(workingDirectory, ['update-ref', 'refs/remotes/origin/main', base])
      const head = commit(workingDirectory, 'head', 'two')
      runGit(workingDirectory, ['checkout', '-b', 'unrelated', base])
      const unrelated = commit(workingDirectory, 'unrelated', 'three')

      const reader = createReviewRangeReader()
      expect(reader('main', head, undefined)).toBe(`${base}..${head}`)
      expect(reader('main', head, base)).toBe(`${base}..${head}`)
      expect(() => reader('main', head, unrelated)).toThrow(/Command failed/)
    } finally {
      process.chdir(originalDirectory)
    }
  })
})
