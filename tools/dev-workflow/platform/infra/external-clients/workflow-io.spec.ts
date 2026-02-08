import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'
import { writeFileSync } from 'node:fs'
import { createDefaultWorkflowIO } from './workflow-io'

vi.mock('node:fs', () => ({ writeFileSync: vi.fn() }))

class ProcessExitSignal extends Error {
  constructor() {
    super('process.exit called')
    this.name = 'ProcessExitSignal'
  }
}

describe('createDefaultWorkflowIO', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  it('exit calls process.exit with code', () => {
    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new ProcessExitSignal()
    })
    const io = createDefaultWorkflowIO()

    expect(() => io.exit(42)).toThrow(ProcessExitSignal)
    expect(mockExit).toHaveBeenCalledWith(42)
    mockExit.mockRestore()
  })
})
