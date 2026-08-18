import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  extractDraftComponentsMethodMock: vi.fn(),
  loadMock: vi.fn(),
}))

vi.mock('../data-access/riviere-project/riviere-project-repository', () => ({
  RiviereProjectRepository: class {
    load = mocks.loadMock
  },
}))

vi.mock('../../../infra/external-clients/git/git-changed-files', () => ({
  detectChangedTypeScriptFiles: vi.fn(() => ({ files: [], warnings: [] })),
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

describe('extractDraftComponents', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.loadMock.mockReturnValue({
      extractDraftComponents: mocks.extractDraftComponentsMethodMock,
    })
    mocks.extractDraftComponentsMethodMock.mockReturnValue(DRAFT_ONLY_RESULT.result)
  })

  describe('pull-request source mode', () => {
    it('loads from changed project with base branch when provided', () => {
      new ExtractDraftComponents(new RiviereProjectRepository()).execute({
        allowIncomplete: false,
        baseBranch: 'main',
        configPath: 'config.yml',
        includeConnections: true,
        sourceFileSelection: { kind: 'files', filePaths: [] },
        sourceMode: 'pull-request',
        useTsConfig: false,
      })

      expect(mocks.loadMock).toHaveBeenCalledWith({
        projectRoot: process.cwd(),
        configPath: 'config.yml',
        useTsConfig: false,
      })
    })

    it('loads from changed project without base branch when not provided', () => {
      new ExtractDraftComponents(new RiviereProjectRepository()).execute({
        allowIncomplete: false,
        configPath: 'config.yml',
        includeConnections: true,
        sourceFileSelection: { kind: 'files', filePaths: [] },
        sourceMode: 'pull-request',
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
      new ExtractDraftComponents(new RiviereProjectRepository()).execute({
        allowIncomplete: false,
        configPath: 'config.yml',
        files: ['src/foo.ts', 'src/bar.ts'],
        includeConnections: false,
        sourceFileSelection: { kind: 'files', filePaths: ['src/foo.ts', 'src/bar.ts'] },
        sourceMode: 'files',
        useTsConfig: true,
      })

      expect(mocks.loadMock).toHaveBeenCalledWith({
        projectRoot: process.cwd(),
        configPath: 'config.yml',
        useTsConfig: true,
      })
    })

    it('defaults filePaths to empty array when files is undefined', () => {
      new ExtractDraftComponents(new RiviereProjectRepository()).execute({
        allowIncomplete: false,
        configPath: 'config.yml',
        includeConnections: false,
        sourceFileSelection: { kind: 'files', filePaths: [] },
        sourceMode: 'files',
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
      new ExtractDraftComponents(new RiviereProjectRepository()).execute({
        allowIncomplete: false,
        configPath: 'config.yml',
        includeConnections: true,
        sourceFileSelection: { kind: 'all' },
        sourceMode: 'all',
        useTsConfig: true,
      })

      expect(mocks.loadMock).toHaveBeenCalledWith({
        projectRoot: process.cwd(),
        configPath: 'config.yml',
        useTsConfig: true,
      })
    })
  })

  it('forwards an already translated source file selection', () => {
    new ExtractDraftComponents(new RiviereProjectRepository()).execute({
      allowIncomplete: false,
      configPath: 'config.yml',
      includeConnections: false,
      sourceFileSelection: { kind: 'files', filePaths: [`${process.cwd()}/selected.ts`] },
      sourceMode: 'all',
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
      const result = new ExtractDraftComponents(new RiviereProjectRepository()).execute({
        allowIncomplete: true,
        configPath: 'config.yml',
        includeConnections: false,
        sourceFileSelection: { kind: 'all' },
        sourceMode: 'all',
        useTsConfig: false,
      })

      expect(result).toStrictEqual(DRAFT_ONLY_RESULT)
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

      const result = new ExtractDraftComponents(new RiviereProjectRepository()).execute({
        allowIncomplete: true,
        configPath: 'missing.yml',
        includeConnections: false,
        sourceFileSelection: { kind: 'all' },
        sourceMode: 'all',
        useTsConfig: false,
      })

      expect(result).toStrictEqual({
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

      const result = new ExtractDraftComponents(new RiviereProjectRepository()).execute({
        allowIncomplete: false,
        configPath: 'config.yml',
        includeConnections: true,
        sourceFileSelection: { kind: 'all' },
        sourceMode: 'all',
        useTsConfig: true,
      })

      expect(result).toStrictEqual({
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
        new ExtractDraftComponents(new RiviereProjectRepository()).execute({
          allowIncomplete: true,
          configPath: 'config.yml',
          includeConnections: false,
          sourceFileSelection: { kind: 'all' },
          sourceMode: 'all',
          useTsConfig: false,
        }),
      ).toThrow('Unexpected failure')
    })
  })

  it('returns data access failure when loading the project fails', () => {
    mocks.loadMock.mockImplementation(() => {
      throw new ExtractionDataAccessError('FILE_READ_ERROR', 'Could not read project')
    })

    const result = new ExtractDraftComponents(new RiviereProjectRepository()).execute({
      allowIncomplete: true,
      configPath: 'config.yml',
      includeConnections: false,
      sourceFileSelection: { kind: 'all' },
      sourceMode: 'all',
      useTsConfig: false,
    })

    expect(result).toStrictEqual({
      result: {
        code: 'FILE_READ_ERROR',
        kind: 'dataAccessFailure',
        message: 'Could not read project',
      },
    })
  })
})
