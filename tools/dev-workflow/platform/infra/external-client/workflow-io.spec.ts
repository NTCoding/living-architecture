import {
  describe, it, expect, vi, beforeEach, afterEach 
} from 'vitest'
import { writeFileSync } from 'node:fs'
import { createDefaultWorkflowIO } from './workflow-io'

vi.mock('node:fs', () => ({ writeFileSync: vi.fn() }))

const mockProcessExit = vi.fn()
const mockStdoutWrite = vi.fn(
  (
    _data: string | Uint8Array,
    encodingOrCb?: BufferEncoding | ((error?: Error | null) => void),
    cb?: (error?: Error | null) => void,
  ): boolean => {
    const callback = typeof encodingOrCb === 'function' ? encodingOrCb : cb
    if (callback) callback()
    return true
  },
)

describe('createDefaultWorkflowIO', () => {
  const originalExit = process.exit
  const originalWrite = process.stdout.write

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(process, 'exit', {
      value: mockProcessExit,
      configurable: true,
    })
    Object.defineProperty(process.stdout, 'write', {
      value: mockStdoutWrite,
      configurable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(process, 'exit', {
      value: originalExit,
      configurable: true,
    })
    Object.defineProperty(process.stdout, 'write', {
      value: originalWrite,
      configurable: true,
    })
    vi.restoreAllMocks()
  })

  it('writeFile calls writeFileSync with utf-8 encoding', () => {
    const io = createDefaultWorkflowIO()
    io.writeFile('/path/to/file.txt', 'content')

    expect(writeFileSync).toHaveBeenCalledWith('/path/to/file.txt', 'content', 'utf-8')
  })

  it('log calls console.log', () => {
    const mockLog = vi.spyOn(console, 'log').mockImplementation(vi.fn())
    const io = createDefaultWorkflowIO()

    io.log('test output')

    expect(mockLog).toHaveBeenCalledWith('test output')
  })

  it('exit flushes stdout then calls process.exit', async () => {
    const io = createDefaultWorkflowIO()

    io.exit(42)

    await vi.waitFor(() => {
      expect(mockProcessExit).toHaveBeenCalledWith(42)
    })
    expect(mockStdoutWrite).toHaveBeenCalledWith('', expect.any(Function))
  })
})
