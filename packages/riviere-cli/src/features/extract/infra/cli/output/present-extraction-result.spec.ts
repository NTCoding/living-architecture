import {
  beforeEach, describe, expect, it, vi 
} from 'vitest'

const mocks = vi.hoisted(() => ({ outputResult: vi.fn() }))

vi.mock('../../../../../platform/infra/cli/output/output-writer', () => ({outputResult: mocks.outputResult,}))

import { presentExtractionResult } from './present-extraction-result'

describe('presentExtractionResult', () => {
  beforeEach(() => {
    mocks.outputResult.mockReset()
  })

  it('writes draft results to stdout payload when no output path is provided', () => {
    const options = { config: '/repo/config.yaml' }

    presentExtractionResult(
      {
        kind: 'draftOnly',
        components: [
          {
            type: 'api',
            name: 'Create Order',
            domain: 'orders',
            location: {
              file: 'a.ts',
              line: 1,
            },
          },
        ],
      },
      options,
    )

    expect(mocks.outputResult).toHaveBeenCalledWith(expect.any(Object), {})
  })

  it('passes output path through for full results', () => {
    const options = {
      config: '/repo/config.yaml',
      output: '/repo/result.json',
    }
    const expectedOutputOptions = { output: '/repo/result.json' }

    presentExtractionResult(
      {
        kind: 'full',
        components: [],
        links: [],
        timings: [],
        failedFields: [],
      },
      options,
    )

    expect(mocks.outputResult).toHaveBeenCalledWith(expect.any(Object), expectedOutputOptions)
  })
})
