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

const outputPath = join(process.cwd(), 'tmp-output.json')

describe('outputResult', () => {
  afterEach(() => {
    vi.clearAllMocks()
    mockWriteFileSync.mockReset()
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

  it('throws the original filesystem error when file writing fails', () => {
    mockWriteFileSync.mockImplementation(() => {
      throw new OutputWriteFailure('permission denied')
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
    ).toThrow('permission denied')
  })

  it('throws string write failures unchanged', () => {
    mockWriteFileSync.mockImplementation(() => {
      throw 'disk-full'
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
    ).toThrow('disk-full')
  })
})
