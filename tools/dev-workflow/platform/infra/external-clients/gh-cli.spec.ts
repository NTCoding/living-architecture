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

  it('returns success when gh pr checks passes', () => {
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

  it('returns failure when gh pr checks exits non-zero', () => {
    mockExecFileSync.mockImplementation(() => {
      const error = new GitHubError('some checks failed')
      throw error
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
})
