import {
  describe, it, expect, vi, beforeEach, afterEach 
} from 'vitest'
import { Readable } from 'node:stream'

const {
  mockShouldSkipHooks, mockParseHookInput, mockRouteToHandler 
} = vi.hoisted(() => ({
  mockShouldSkipHooks: vi.fn(),
  mockParseHookInput: vi.fn(),
  mockRouteToHandler: vi.fn(),
}))

const mockProcessExit = vi.fn()

vi.mock('../use-cases/handle-hook', () => ({
  shouldSkipHooks: mockShouldSkipHooks,
  parseHookInput: mockParseHookInput,
  routeToHandler: mockRouteToHandler,
}))

describe('hook-router', () => {
  const originalStdin = process.stdin
  const originalExit = process.exit
  const capturedOutput: string[] = []
  const capturedErrors: string[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    capturedOutput.length = 0
    capturedErrors.length = 0
    vi.spyOn(console, 'log').mockImplementation((msg: string) => {
      capturedOutput.push(msg)
    })
    vi.spyOn(console, 'error').mockImplementation((msg: string) => {
      capturedErrors.push(msg)
    })
    Object.defineProperty(process, 'exit', {
      value: mockProcessExit,
      configurable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(process, 'stdin', {
      value: originalStdin,
      configurable: true,
    })
    Object.defineProperty(process, 'exit', {
      value: originalExit,
      configurable: true,
    })
    vi.restoreAllMocks()
  })

  function mockStdin(content: string): void {
    const readable = new Readable({
      read() {
        this.push(content)
        this.push(null)
      },
    })
    Object.defineProperty(process, 'stdin', {
      value: readable,
      configurable: true,
    })
  }

  it('outputs empty object when hooks should be skipped', async () => {
    mockShouldSkipHooks.mockReturnValue(true)
    mockStdin('')

    await import('./hook-router')
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(capturedOutput[0]).toStrictEqual('{}')
  })

  it('outputs handler result for valid non-stop input', async () => {
    mockShouldSkipHooks.mockReturnValue(false)
    mockParseHookInput.mockReturnValue({
      success: true,
      input: { hook_event_name: 'PreToolUse' },
    })
    mockRouteToHandler.mockReturnValue({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        permissionDecisionReason: 'ok',
      },
    })
    mockStdin('{"hook_event_name":"PreToolUse"}')

    await import('./hook-router')
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(mockRouteToHandler).toHaveBeenCalledWith({ hook_event_name: 'PreToolUse' })
    expect(capturedOutput[0]).toContain('permissionDecision')
  })

  it('outputs empty JSON for stop allow result', async () => {
    mockShouldSkipHooks.mockReturnValue(false)
    mockParseHookInput.mockReturnValue({
      success: true,
      input: { hook_event_name: 'Stop' },
    })
    mockRouteToHandler.mockReturnValue({ _tag: 'allow' })
    mockStdin('{"hook_event_name":"Stop"}')

    await import('./hook-router')
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(capturedOutput[0]).toStrictEqual('{}')
  })

  it('exits with code 2 and stderr for stop block result', async () => {
    mockShouldSkipHooks.mockReturnValue(false)
    mockParseHookInput.mockReturnValue({
      success: true,
      input: { hook_event_name: 'Stop' },
    })
    mockRouteToHandler.mockReturnValue({
      _tag: 'block',
      reason: 'missing prefix' 
    })
    mockStdin('{"hook_event_name":"Stop"}')

    await import('./hook-router')
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(capturedErrors[0]).toBe('missing prefix')
    expect(mockProcessExit).toHaveBeenCalledWith(2)
  })

  it('exits with code 2 for malformed JSON', async () => {
    mockShouldSkipHooks.mockReturnValue(false)
    mockStdin('not valid json')

    await import('./hook-router')
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(capturedErrors[0]).toBe('Invalid hook input: malformed JSON')
    expect(mockProcessExit).toHaveBeenCalledWith(2)
  })

  it('exits with code 2 for invalid hook input', async () => {
    mockShouldSkipHooks.mockReturnValue(false)
    mockParseHookInput.mockReturnValue({
      success: false,
      error: 'missing hook_event_name',
    })
    mockStdin('{"some":"data"}')

    await import('./hook-router')
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(capturedErrors[0]).toBe('Invalid hook input: missing hook_event_name')
    expect(mockProcessExit).toHaveBeenCalledWith(2)
  })

  it('exits with code 2 and logs error message when routeToHandler throws Error', async () => {
    mockShouldSkipHooks.mockReturnValue(false)
    mockParseHookInput.mockReturnValue({
      success: true,
      input: { hook_event_name: 'Stop' },
    })
    mockRouteToHandler.mockImplementation(() => {
      throw new TypeError('Handler failed')
    })
    mockStdin('{"hook_event_name":"Stop"}')

    await import('./hook-router')
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(capturedErrors[0]).toBe('Handler failed')
    expect(mockProcessExit).toHaveBeenCalledWith(2)
  })

  it('exits with code 2 and logs string when routeToHandler throws non-Error', async () => {
    mockShouldSkipHooks.mockReturnValue(false)
    mockParseHookInput.mockReturnValue({
      success: true,
      input: { hook_event_name: 'Stop' },
    })
    mockRouteToHandler.mockImplementation(() => {
      throw 'string error'
    })
    mockStdin('{"hook_event_name":"Stop"}')

    await import('./hook-router')
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(capturedErrors[0]).toBe('string error')
    expect(mockProcessExit).toHaveBeenCalledWith(2)
  })
})
