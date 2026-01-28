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

vi.mock('../use-cases/handle-hook', () => ({
  shouldSkipHooks: mockShouldSkipHooks,
  parseHookInput: mockParseHookInput,
  routeToHandler: mockRouteToHandler,
}))

describe('hook-router', () => {
  const originalStdin = process.stdin
  const capturedOutput: string[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    capturedOutput.length = 0
    vi.spyOn(console, 'log').mockImplementation((msg: string) => {
      capturedOutput.push(msg)
    })
  })

  afterEach(() => {
    Object.defineProperty(process, 'stdin', { value: originalStdin })
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

  it('outputs handler result for valid input', async () => {
    mockShouldSkipHooks.mockReturnValue(false)
    mockParseHookInput.mockReturnValue({
      success: true,
      input: { hook_event_name: 'Stop' },
    })
    mockRouteToHandler.mockReturnValue({ continue: true })
    mockStdin('{"hook_event_name":"Stop"}')

    await import('./hook-router')
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(mockRouteToHandler).toHaveBeenCalledWith({ hook_event_name: 'Stop' })
    expect(capturedOutput[0]).toContain('"continue":true')
  })
})
