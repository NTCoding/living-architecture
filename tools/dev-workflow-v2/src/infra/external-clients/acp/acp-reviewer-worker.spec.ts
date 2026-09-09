import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockReadStdin, mockRunAcpReviewSession } = vi.hoisted(() => ({
  mockReadStdin: vi.fn(),
  mockRunAcpReviewSession: vi.fn(async () => undefined),
}))

vi.mock('./acp-review-session', () => ({
  readStdin: mockReadStdin,
  runAcpReviewSession: mockRunAcpReviewSession,
}))

const VALID_INPUT = {
  command: 'acp-agent',
  args: [],
  requests: [{ reviewer: 'code-review' as const, pullRequestNumber: 42, workflowState: {} }],
}

describe('acp-reviewer-worker', () => {
  beforeEach(() => {
    vi.resetModules()
    mockReadStdin.mockReset()
    mockReadStdin.mockResolvedValue(JSON.stringify(VALID_INPUT))
    mockRunAcpReviewSession.mockClear()
  })

  it('runs a review session for each request with the parsed options', async () => {
    const { runReviewWorker } = await import('./acp-reviewer-worker')
    mockRunAcpReviewSession.mockClear()

    await runReviewWorker(
      {
        command: 'acp-agent',
        args: ['--serve'],
        requests: [
          { reviewer: 'code-review', pullRequestNumber: 42, workflowState: {} },
          { reviewer: 'bug-scanner', pullRequestNumber: 7, workflowState: {} },
        ],
      },
      '/repo',
    )

    expect(mockRunAcpReviewSession).toHaveBeenCalledTimes(2)
    expect(mockRunAcpReviewSession).toHaveBeenNthCalledWith(
      1,
      { reviewer: 'code-review', pullRequestNumber: 42, workflowState: {} },
      { command: 'acp-agent', args: ['--serve'], cwd: '/repo' },
    )
    expect(mockRunAcpReviewSession).toHaveBeenNthCalledWith(
      2,
      { reviewer: 'bug-scanner', pullRequestNumber: 7, workflowState: {} },
      { command: 'acp-agent', args: ['--serve'], cwd: '/repo' },
    )
  })

  it('throws when the input does not match the schema', async () => {
    const { runReviewWorker } = await import('./acp-reviewer-worker')
    mockRunAcpReviewSession.mockClear()

    await expect(
      runReviewWorker({ command: 123, args: [], requests: [] }, '/repo'),
    ).rejects.toThrow('Expected string, received number')
    expect(mockRunAcpReviewSession).not.toHaveBeenCalled()
  })

  it('reads the input from stdin and runs the review sessions', async () => {
    await import('./acp-reviewer-worker')

    expect(mockReadStdin).toHaveBeenCalledWith()
    expect(mockRunAcpReviewSession).toHaveBeenCalledWith(
      { reviewer: 'code-review', pullRequestNumber: 42, workflowState: {} },
      { command: 'acp-agent', args: [], cwd: process.cwd() },
    )
  })
})
