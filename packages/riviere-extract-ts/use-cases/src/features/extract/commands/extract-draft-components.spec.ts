import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  extractDraftComponentsMethodMock: vi.fn(),
  findChangedSourceFilesMock: vi.fn(() => ({ filePaths: [], warnings: [] })),
  findSpecifiedSourceFilesMock: vi.fn((filePaths: readonly string[]) => ({
    filePaths,
    missingFilePaths: [],
  })),
  loadByExtractionConfigPathMock: vi.fn(),
}))

vi.mock('../data-access/riviere-project/riviere-project-repository', () => ({
  RiviereProjectRepository: class {
    loadByExtractionConfigPath = mocks.loadByExtractionConfigPathMock
  },
}))

import { ExtractDraftComponents } from './extract-draft-components'
import { RiviereProjectRepository } from '../data-access/riviere-project/riviere-project-repository'
import { ExtractionConfigError } from '../data-access/riviere-project/riviere-config-error'
import { ExtractionDataAccessError } from '../data-access/riviere-project/riviere-project-error'
import { ConnectionDetectionError } from '@living-architecture/riviere-extract-ts-domain-model/domain/connection-detection/connection-detection-error'

const DRAFT_ONLY_RESULT = {
  result: {
    kind: 'draftOnly' as const,
    components: [],
  },
}

class UnexpectedLoadingError extends Error {}

function createExtractDraftComponents(now: () => number = () => 0): ExtractDraftComponents {
  return new ExtractDraftComponents(
    new RiviereProjectRepository(),
    mocks.findChangedSourceFilesMock,
    mocks.findSpecifiedSourceFilesMock,
    now,
  )
}

describe('extractDraftComponents', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.findChangedSourceFilesMock.mockReturnValue({ filePaths: [], warnings: [] })
    mocks.loadByExtractionConfigPathMock.mockReturnValue({
      extractDraftComponents: mocks.extractDraftComponentsMethodMock,
    })
    mocks.extractDraftComponentsMethodMock.mockReturnValue(DRAFT_ONLY_RESULT.result)
  })

  describe('pull-request source mode', () => {
    it('loads from changed project with base branch when provided', () => {
      createExtractDraftComponents().execute({
        allowIncomplete: false,
        configPath: 'config.yml',
        includeConnections: true,
        sourceFileSelectionRequest: { kind: 'changed', baseBranch: 'main' },
        useTsConfig: false,
      })

      expect(mocks.loadByExtractionConfigPathMock).toHaveBeenCalledWith({
        projectRoot: process.cwd(),
        configPath: 'config.yml',
        useTsConfig: false,
      })
    })

    it('loads from changed project without base branch when not provided', () => {
      createExtractDraftComponents().execute({
        allowIncomplete: false,
        configPath: 'config.yml',
        includeConnections: true,
        sourceFileSelectionRequest: { kind: 'changed' },
        useTsConfig: false,
      })

      expect(mocks.loadByExtractionConfigPathMock).toHaveBeenCalledWith({
        projectRoot: process.cwd(),
        configPath: 'config.yml',
        useTsConfig: false,
      })
    })
  })

  describe('files source mode', () => {
    it('loads from selected files when files are provided', () => {
      createExtractDraftComponents().execute({
        allowIncomplete: false,
        configPath: 'config.yml',
        includeConnections: false,
        sourceFileSelectionRequest: { kind: 'files', filePaths: ['src/foo.ts', 'src/bar.ts'] },
        useTsConfig: true,
      })

      expect(mocks.loadByExtractionConfigPathMock).toHaveBeenCalledWith({
        projectRoot: process.cwd(),
        configPath: 'config.yml',
        useTsConfig: true,
      })
    })

    it('defaults filePaths to empty array when files is undefined', () => {
      createExtractDraftComponents().execute({
        allowIncomplete: false,
        configPath: 'config.yml',
        includeConnections: false,
        sourceFileSelectionRequest: { kind: 'files', filePaths: [] },
        useTsConfig: true,
      })

      expect(mocks.loadByExtractionConfigPathMock).toHaveBeenCalledWith({
        projectRoot: process.cwd(),
        configPath: 'config.yml',
        useTsConfig: true,
      })
    })
  })

  describe('all source mode', () => {
    it('loads from full project', () => {
      createExtractDraftComponents().execute({
        allowIncomplete: false,
        configPath: 'config.yml',
        includeConnections: true,
        sourceFileSelectionRequest: { kind: 'all' },
        useTsConfig: true,
      })

      expect(mocks.loadByExtractionConfigPathMock).toHaveBeenCalledWith({
        projectRoot: process.cwd(),
        configPath: 'config.yml',
        useTsConfig: true,
      })
    })
  })

  it('passes the domain-resolved selection to the aggregate', () => {
    createExtractDraftComponents().execute({
      allowIncomplete: false,
      configPath: 'config.yml',
      includeConnections: false,
      sourceFileSelectionRequest: { kind: 'files', filePaths: [`${process.cwd()}/selected.ts`] },
      useTsConfig: false,
    })

    expect(mocks.extractDraftComponentsMethodMock).toHaveBeenCalledWith({
      allowIncomplete: false,
      includeConnections: false,
      observeConnectionDetectionPhase: expect.any(Function),
      sourceFileSelection: { kind: 'files', filePaths: [`${process.cwd()}/selected.ts`] },
    })
  })

  describe('result forwarding', () => {
    it('measures connection detection phases outside the aggregate', () => {
      mocks.extractDraftComponentsMethodMock.mockImplementation(
        (options: {
          observeConnectionDetectionPhase: (event: {
            phase: 'setup' | 'callGraph' | 'detection' | 'total'
            status: 'started' | 'completed'
          }) => void
        }) => {
          const observe = options.observeConnectionDetectionPhase
          observe({ phase: 'total', status: 'started' })
          observe({ phase: 'setup', status: 'started' })
          observe({ phase: 'setup', status: 'completed' })
          observe({ phase: 'callGraph', status: 'started' })
          observe({ phase: 'callGraph', status: 'completed' })
          observe({ phase: 'detection', status: 'started' })
          observe({ phase: 'detection', status: 'completed' })
          observe({ phase: 'total', status: 'completed' })
          return {
            kind: 'full',
            components: [],
            failedFields: [],
            links: [],
            externalLinks: [],
          }
        },
      )
      const times = [0, 1, 3, 4, 9, 10, 17, 20]

      const result = createExtractDraftComponents(() => times.shift() ?? 0).execute({
        allowIncomplete: true,
        configPath: 'config.yml',
        includeConnections: true,
        sourceFileSelectionRequest: { kind: 'all' },
        useTsConfig: false,
      })

      expect(result.result).toMatchObject({
        kind: 'full',
        timings: [{ setupMs: 2, callGraphMs: 5, asyncDetectionMs: 7, totalMs: 20 }],
      })
    })

    it('records zero for phases that did not start', () => {
      mocks.extractDraftComponentsMethodMock.mockImplementation(
        (options: {
          observeConnectionDetectionPhase: (event: {
            phase: 'setup' | 'callGraph' | 'detection' | 'total'
            status: 'started' | 'completed'
          }) => void
        }) => {
          const observe = options.observeConnectionDetectionPhase
          observe({ phase: 'setup', status: 'completed' })
          observe({ phase: 'callGraph', status: 'completed' })
          observe({ phase: 'detection', status: 'completed' })
          observe({ phase: 'total', status: 'completed' })
          return {
            kind: 'full',
            components: [],
            failedFields: [],
            links: [],
            externalLinks: [],
          }
        },
      )

      const result = createExtractDraftComponents(() => 10).execute({
        allowIncomplete: true,
        configPath: 'config.yml',
        includeConnections: true,
        sourceFileSelectionRequest: { kind: 'all' },
        useTsConfig: false,
      })

      expect(result.result).toMatchObject({
        kind: 'full',
        timings: [{ setupMs: 0, callGraphMs: 0, asyncDetectionMs: 0, totalMs: 0 }],
      })
    })

    it('returns the extraction result', () => {
      const result = createExtractDraftComponents().execute({
        allowIncomplete: true,
        configPath: 'config.yml',
        includeConnections: false,
        sourceFileSelectionRequest: { kind: 'all' },
        useTsConfig: false,
      })

      expect(result).toStrictEqual({ ...DRAFT_ONLY_RESULT, warnings: [] })
      expect(mocks.extractDraftComponentsMethodMock).toHaveBeenCalledWith({
        allowIncomplete: true,
        includeConnections: false,
        observeConnectionDetectionPhase: expect.any(Function),
        sourceFileSelection: { kind: 'all' },
      })
    })

    it('returns the requested output path', () => {
      const result = createExtractDraftComponents().execute({
        allowIncomplete: true,
        configPath: 'config.yml',
        includeConnections: false,
        output: 'draft-components.json',
        sourceFileSelectionRequest: { kind: 'all' },
        useTsConfig: false,
      })

      expect(result.outputPath).toBe('draft-components.json')
    })

    it('returns config failure when loading the extraction config fails', () => {
      mocks.loadByExtractionConfigPathMock.mockImplementation(() => {
        throw new ExtractionConfigError('CONFIG_NOT_FOUND', 'Config file not found')
      })

      const result = createExtractDraftComponents().execute({
        allowIncomplete: true,
        configPath: 'missing.yml',
        includeConnections: false,
        sourceFileSelectionRequest: { kind: 'all' },
        useTsConfig: false,
      })

      expect(result).toStrictEqual({
        warnings: [],
        result: {
          code: 'CONFIG_NOT_FOUND',
          kind: 'configFailure',
          message: 'Config file not found',
        },
      })
    })

    it('returns connection detection failure from extraction', () => {
      mocks.extractDraftComponentsMethodMock.mockImplementation(() => {
        throw new ConnectionDetectionError({
          file: 'src/handler.ts',
          line: 42,
          reason: 'Could not resolve type',
          typeName: 'OrderService',
        })
      })

      const result = createExtractDraftComponents().execute({
        allowIncomplete: false,
        configPath: 'config.yml',
        includeConnections: true,
        sourceFileSelectionRequest: { kind: 'all' },
        useTsConfig: true,
      })

      expect(result).toStrictEqual({
        warnings: [],
        result: {
          kind: 'connectionDetectionFailure',
          message: 'src/handler.ts:42: Could not resolve type — OrderService',
        },
      })
    })

    it('rethrows unexpected loading errors', () => {
      mocks.loadByExtractionConfigPathMock.mockImplementation(() => {
        throw new UnexpectedLoadingError('Unexpected failure')
      })

      expect(() =>
        createExtractDraftComponents().execute({
          allowIncomplete: true,
          configPath: 'config.yml',
          includeConnections: false,
          sourceFileSelectionRequest: { kind: 'all' },
          useTsConfig: false,
        }),
      ).toThrow('Unexpected failure')
    })
  })

  it('returns data access failure when loading the project fails', () => {
    mocks.loadByExtractionConfigPathMock.mockImplementation(() => {
      throw new ExtractionDataAccessError('FILE_READ_ERROR', 'Could not read project')
    })

    const result = createExtractDraftComponents().execute({
      allowIncomplete: true,
      configPath: 'config.yml',
      includeConnections: false,
      sourceFileSelectionRequest: { kind: 'all' },
      useTsConfig: false,
    })

    expect(result).toStrictEqual({
      warnings: [],
      result: {
        code: 'FILE_READ_ERROR',
        kind: 'dataAccessFailure',
        message: 'Could not read project',
      },
    })
  })
})
