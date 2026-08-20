import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  extractDraftComponentsMethodMock: vi.fn(),
  findChangedSourceFilesMock: vi.fn(() => ({ filePaths: [], warnings: [] })),
  findSpecifiedSourceFilesMock: vi.fn((filePaths: readonly string[]) => ({
    filePaths,
    missingFilePaths: [],
  })),
  loadMock: vi.fn(),
}))

vi.mock('../data-access/riviere-project/riviere-project-repository', () => ({
  RiviereProjectRepository: class {
    load = mocks.loadMock
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

function createExtractDraftComponents(): ExtractDraftComponents {
  return new ExtractDraftComponents(
    new RiviereProjectRepository(),
    mocks.findChangedSourceFilesMock,
    mocks.findSpecifiedSourceFilesMock,
  )
}

describe('extractDraftComponents', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.findChangedSourceFilesMock.mockReturnValue({ filePaths: [], warnings: [] })
    mocks.loadMock.mockReturnValue({
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

      expect(mocks.loadMock).toHaveBeenCalledWith({
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

      expect(mocks.loadMock).toHaveBeenCalledWith({
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

      expect(mocks.loadMock).toHaveBeenCalledWith({
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

      expect(mocks.loadMock).toHaveBeenCalledWith({
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

      expect(mocks.loadMock).toHaveBeenCalledWith({
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
      sourceFileSelection: { kind: 'files', filePaths: [`${process.cwd()}/selected.ts`] },
    })
  })

  describe('result forwarding', () => {
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
        sourceFileSelection: { kind: 'all' },
      })
    })

    it('returns config failure when loading the extraction config fails', () => {
      mocks.loadMock.mockImplementation(() => {
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
      mocks.loadMock.mockImplementation(() => {
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
    mocks.loadMock.mockImplementation(() => {
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
