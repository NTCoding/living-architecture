import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'

const { mockExecFileSync } = vi.hoisted(() => ({ mockExecFileSync: vi.fn() }))

vi.mock('node:child_process', () => ({ execFileSync: mockExecFileSync }))

import { ghCli } from './gh-cli'
import { GitHubError } from './github-rest-client'

describe('ghCli.watchCI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns success when checks pass', () => {
    mockExecFileSync.mockReturnValue('All checks passed\n')

    const result = ghCli.watchCI(123)

    expect(result.failed).toBe(false)
    expect(result.output).toContain('All checks passed')
    expect(mockExecFileSync).toHaveBeenCalledWith(
      '/usr/bin/env',
      ['gh', 'pr', 'checks', '123', '--watch'],
      expect.objectContaining({
        encoding: 'utf-8',
        timeout: 600000,
      }),
    )
  })

  it('returns failure with stdout when checks fail', () => {
    mockExecFileSync.mockImplementation(() => {
      const error = new GitHubError('Command failed')
      Object.assign(error, {
        stdout: 'knip\tfail\t19s\nhttps://github.com/run/1\n',
        stderr: '',
      })
      throw error
    })

    const result = ghCli.watchCI(456)

    expect(result.failed).toBe(true)
    expect(result.output).toContain('knip')
    expect(result.output).toContain('fail')
  })

  it('falls back to error message when no stdout/stderr', () => {
    mockExecFileSync.mockImplementation(() => {
      throw new GitHubError('some checks failed')
    })

    const result = ghCli.watchCI(456)

    expect(result.failed).toBe(true)
    expect(result.output).toContain('some checks failed')
  })

  it('handles non-Error throws', () => {
    mockExecFileSync.mockImplementation(() => {
      throw 'string error'
    })

    const result = ghCli.watchCI(789)

    expect(result.failed).toBe(true)
    expect(result.output).toBe('string error')
  })

  it('retries when no checks reported then succeeds', () => {
    const ghChecksCalls: number[] = []
    mockExecFileSync.mockImplementation((_cmd: string, args: string[]) => {
      if (args[0] === 'sleep') return undefined
      ghChecksCalls.push(ghChecksCalls.length)
      if (ghChecksCalls.length === 1) {
        throw new GitHubError('no checks reported on branch')
      }
      return 'All checks passed\n'
    })

    const result = ghCli.watchCI(123)

    expect(result.failed).toBe(false)
    expect(result.output).toContain('All checks passed')
  })

  it('returns failure after exhausting retries for no checks', () => {
    const ghCheckCalls: number[] = []
    mockExecFileSync.mockImplementation((_cmd: string, args: string[]) => {
      if (args[0] === 'sleep') return undefined
      ghCheckCalls.push(1)
      throw new GitHubError('no checks reported on branch')
    })

    const result = ghCli.watchCI(123)

    expect(result.failed).toBe(true)
    expect(result.output).toContain('no checks reported')
    expect(ghCheckCalls).toHaveLength(6)
  })

  it('does not retry for non-checks errors', () => {
    mockExecFileSync.mockImplementation(() => {
      throw new GitHubError('network timeout')
    })

    const result = ghCli.watchCI(123)

    expect(result.failed).toBe(true)
    expect(result.output).toContain('network timeout')
    expect(mockExecFileSync).toHaveBeenCalledTimes(1)
  })
})
