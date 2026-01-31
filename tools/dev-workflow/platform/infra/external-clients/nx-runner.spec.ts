import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'

const { mockExecFileAsync } = vi.hoisted(() => ({ mockExecFileAsync: vi.fn() }))

vi.mock('node:util', () => ({ promisify: () => mockExecFileAsync }))

import { nx } from './nx-runner'

describe('nx.runMany', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns success result when command succeeds', async () => {
    mockExecFileAsync.mockResolvedValue({
      stdout: 'stdout output',
      stderr: 'stderr output',
    })

    const result = await nx.runMany(['lint', 'test'])

    expect(result.failed).toBe(false)
    expect(result.output).toBe('stdout outputstderr output')
  })

  it('calls pnpm nx run-many with targets', async () => {
    mockExecFileAsync.mockResolvedValue({
      stdout: '',
      stderr: '',
    })

    await nx.runMany(['build', 'lint'])

    expect(mockExecFileAsync).toHaveBeenCalledWith(
      'pnpm',
      ['nx', 'run-many', '-t', 'build', 'lint'],
      expect.any(Object),
    )
  })

  it('returns failed result with output when command fails with exec error', async () => {
    const execError = {
      stdout: 'partial stdout',
      stderr: 'error stderr',
      code: 1,
      message: 'Command failed',
    }
    mockExecFileAsync.mockRejectedValue(execError)

    const result = await nx.runMany(['test'])

    expect(result.failed).toBe(true)
    expect(result.output).toContain('partial stdout')
  })

  it('includes all error parts in output', async () => {
    const execError = {
      stdout: 'partial stdout',
      stderr: 'error stderr',
      code: 1,
      message: 'Command failed',
    }
    mockExecFileAsync.mockRejectedValue(execError)

    const result = await nx.runMany(['test'])

    expect(result.output).toContain('error stderr')
    expect(result.output).toContain('Command failed')
  })

  it('returns failed result with stringified error when error is not exec error', async () => {
    mockExecFileAsync.mockRejectedValue('unexpected error')

    const result = await nx.runMany(['lint'])

    expect(result.failed).toBe(true)
    expect(result.output).toBe('unexpected error')
  })

  it('handles exec error with missing optional fields', async () => {
    const partialError = { message: 'Some error' }
    mockExecFileAsync.mockRejectedValue(partialError)

    const result = await nx.runMany(['test'])

    expect(result.failed).toBe(true)
    expect(result.output).toContain('Some error')
  })
})
