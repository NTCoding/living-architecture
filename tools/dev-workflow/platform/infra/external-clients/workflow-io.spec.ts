import {
  describe, it, expect, vi, beforeEach, afterEach 
} from 'vitest'
import { writeFileSync } from 'node:fs'
import { createDefaultWorkflowIO } from './workflow-io'

vi.mock('node:fs', () => ({ writeFileSync: vi.fn() }))

describe('createDefaultWorkflowIO', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.exitCode = undefined
  })

  afterEach(() => {
    process.exitCode = undefined
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
    mockLog.mockRestore()
  })

  it('exit sets process.exitCode', () => {
    const io = createDefaultWorkflowIO()

    io.exit(42)

    expect(process.exitCode).toBe(42)
  })
})
