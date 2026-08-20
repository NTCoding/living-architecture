import { afterEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ writeFileSync: vi.fn() }))

vi.mock('node:fs', () => ({ writeFileSync: mocks.writeFileSync }))

import { ExitCode } from '../../../../infra/cli/presentation/error-codes'
import {
  outputEnrichDraftComponentsResult,
  outputExtractDraftComponentsResult,
} from './output-writer'

class ProcessExitForTestError extends Error {
  constructor(readonly exitCode: number | string | null | undefined) {
    super(`Process exited with ${String(exitCode)}`)
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  mocks.writeFileSync.mockReset()
})

it('writes a successful draft-only extraction result to the requested path', () => {
  outputExtractDraftComponentsResult({
    outputPath: 'drafts.json',
    result: { components: [{ name: 'Draft' }], kind: 'draftOnly' },
  })

  expect(mocks.writeFileSync).toHaveBeenCalledWith(
    'drafts.json',
    JSON.stringify({ success: true, data: [{ name: 'Draft' }], warnings: [] }),
  )
})

it('writes a successful full enrichment result to the requested path', () => {
  outputEnrichDraftComponentsResult({
    outputPath: 'enriched.json',
    result: {
      components: [{ name: 'Draft' }],
      externalLinks: [],
      kind: 'full',
      links: [],
    },
  })

  expect(mocks.writeFileSync).toHaveBeenCalledWith(
    'enriched.json',
    JSON.stringify({
      success: true,
      data: { components: [{ name: 'Draft' }], links: [], externalLinks: [] },
      warnings: [],
    }),
  )
})

it('reports a write error as a runtime error', () => {
  mocks.writeFileSync.mockImplementation(() => {
    throw new ProcessExitForTestError('Disk full')
  })
  const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined)
  const exit = vi.spyOn(process, 'exit').mockImplementation((exitCode) => {
    throw new ProcessExitForTestError(exitCode)
  })

  expect(() =>
    outputExtractDraftComponentsResult({
      outputPath: 'drafts.json',
      result: { components: [], kind: 'draftOnly' },
    }),
  ).toThrow(ProcessExitForTestError)

  expect(consoleLog).toHaveBeenCalledWith(
    JSON.stringify({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Failed to write output file: drafts.json',
        suggestions: [],
      },
    }),
  )
  expect(exit).toHaveBeenCalledWith(ExitCode.RuntimeError)
})

it('does not present a failed command result', () => {
  const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined)

  outputEnrichDraftComponentsResult({
    result: { kind: 'dataAccessFailure', code: 'FILE_READ_ERROR', message: 'Cannot read file' },
  })

  expect(consoleLog).not.toHaveBeenCalled()
})
