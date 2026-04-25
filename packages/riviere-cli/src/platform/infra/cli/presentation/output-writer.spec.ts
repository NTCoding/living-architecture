import {
  afterEach, describe, expect, it, vi 
} from 'vitest'
import { join } from 'node:path'

const { mockWriteFileSync } = vi.hoisted(() => ({ mockWriteFileSync: vi.fn() }))

vi.mock('node:fs', () => ({ writeFileSync: mockWriteFileSync }))

import { outputResult } from './output-writer'

class OutputWriteFailure extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OutputWriteFailure'
  }
}

class ExitCalledError extends Error {
  constructor() {
    super('exit called')
    this.name = 'ExitCalledError'
  }
}

const outputPath = join(process.cwd(), 'tmp-output.json')

describe('outputResult', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('writes the success payload to the requested output file', () => {
    outputResult(
      {
        success: true,
        data: { count: 1 },
        warnings: [],
      },
      { output: outputPath },
    )

    expect(mockWriteFileSync).toHaveBeenCalledWith(
      outputPath,
      JSON.stringify({
        success: true,
        data: { count: 1 },
        warnings: [],
      }),
    )
  })

  it('includes the original filesystem error message when file writing fails', () => {
    mockWriteFileSync.mockImplementation(() => {
      throw new OutputWriteFailure('permission denied')
    })
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new ExitCalledError()
    })

    expect(() =>
      outputResult(
        {
          success: true,
          data: { count: 1 },
          warnings: [],
        },
        { output: outputPath },
      ),
    ).toThrow('exit called')

    expect(log).toHaveBeenCalledWith(
      JSON.stringify({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Failed to write output file: ${outputPath}. permission denied`,
          suggestions: [],
        },
      }),
    )
    expect(exit).toHaveBeenCalledWith(3)
  })

  it('stringifies non-Error write failures', () => {
    mockWriteFileSync.mockImplementation(() => {
      throw 'disk-full'
    })
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new ExitCalledError()
    })

    expect(() =>
      outputResult(
        {
          success: true,
          data: { count: 1 },
          warnings: [],
        },
        { output: outputPath },
      ),
    ).toThrow('exit called')

    expect(log).toHaveBeenCalledWith(
      JSON.stringify({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Failed to write output file: ${outputPath}. disk-full`,
          suggestions: [],
        },
      }),
    )
    expect(exit).toHaveBeenCalledWith(3)
  })
})
