import {
  describe, it, expect, vi, beforeEach, afterEach 
} from 'vitest'

const {
  mockAddThreadReply, mockResolveThread 
} = vi.hoisted(() => ({
  mockAddThreadReply: vi.fn(),
  mockResolveThread: vi.fn(),
}))

vi.mock('../../../platform/infra/external-clients/github-rest-client', () => ({
  github: {
    addThreadReply: mockAddThreadReply,
    resolveThread: mockResolveThread,
  },
}))

import {
  respondToFeedback, executeRespondToFeedback 
} from './respond-to-feedback'

class ExitSignal extends Error {
  constructor() {
    super('exit called')
    this.name = 'ExitSignal'
  }
}

describe('respondToFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAddThreadReply.mockResolvedValue(undefined)
    mockResolveThread.mockResolvedValue(undefined)
  })

  it('calls github addThreadReply with formatted body', async () => {
    await respondToFeedback({
      threadId: 'PRRT_123',
      action: 'fixed',
      message: 'Applied the fix',
    })

    expect(mockAddThreadReply).toHaveBeenCalledWith(
      'PRRT_123',
      expect.stringContaining('✅ **Fixed**'),
    )
  })

  it('calls github resolveThread', async () => {
    await respondToFeedback({
      threadId: 'PRRT_456',
      action: 'rejected',
      message: 'Not applicable',
    })

    expect(mockResolveThread).toHaveBeenCalledWith('PRRT_456')
  })

  it('returns success result with input details', async () => {
    const result = await respondToFeedback({
      threadId: 'PRRT_789',
      action: 'fixed',
      message: 'Done',
    })

    expect(result).toStrictEqual({
      success: true,
      threadId: 'PRRT_789',
      action: 'fixed',
    })
  })

  it('validates input and rejects empty threadId', async () => {
    await expect(
      respondToFeedback({
        threadId: '',
        action: 'fixed',
        message: 'Done',
      }),
    ).rejects.toThrow('threadId is required')
  })

  it('validates input and rejects empty message', async () => {
    await expect(
      respondToFeedback({
        threadId: 'PRRT_123',
        action: 'fixed',
        message: '',
      }),
    ).rejects.toThrow('message is required')
  })
})

describe('executeRespondToFeedback', () => {
  const originalArgv = process.argv
  const capturedOutput: string[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    capturedOutput.length = 0
    mockAddThreadReply.mockResolvedValue(undefined)
    mockResolveThread.mockResolvedValue(undefined)
    vi.spyOn(console, 'log').mockImplementation((msg: string) => {
      capturedOutput.push(msg)
    })
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new ExitSignal()
    })
  })

  afterEach(() => {
    process.argv = originalArgv
    vi.restoreAllMocks()
  })

  it('parses CLI args and calls respondToFeedback', async () => {
    process.argv = [
      'node',
      'script',
      '--thread-id',
      'PRRT_cli',
      '--action',
      'fixed',
      '--message',
      'CLI message',
    ]

    await executeRespondToFeedback()

    expect(mockAddThreadReply).toHaveBeenCalledWith(
      'PRRT_cli',
      expect.stringContaining('✅ **Fixed**'),
    )
  })

  it('logs success output as JSON', async () => {
    process.argv = [
      'node',
      'script',
      '--thread-id',
      'PRRT_json',
      '--action',
      'rejected',
      '--message',
      'Rejected reason',
    ]

    await executeRespondToFeedback()

    expect(capturedOutput[0]).toContain('"success": true')
  })

  it('throws when threadId missing', async () => {
    process.argv = ['node', 'script', '--action', 'fixed', '--message', 'Missing threadId']

    await expect(executeRespondToFeedback()).rejects.toThrow('invalid_type')
  })

  it('throws when action missing', async () => {
    process.argv = ['node', 'script', '--thread-id', 'PRRT_123', '--message', 'Missing action']

    await expect(executeRespondToFeedback()).rejects.toThrow('invalid_type')
  })

  it('throws when message missing', async () => {
    process.argv = ['node', 'script', '--thread-id', 'PRRT_123', '--action', 'fixed']

    await expect(executeRespondToFeedback()).rejects.toThrow('invalid_type')
  })

  it('throws when action is invalid', async () => {
    process.argv = [
      'node',
      'script',
      '--thread-id',
      'PRRT_123',
      '--action',
      'invalid',
      '--message',
      'Invalid action',
    ]

    await expect(executeRespondToFeedback()).rejects.toThrow('Invalid option')
  })
})
