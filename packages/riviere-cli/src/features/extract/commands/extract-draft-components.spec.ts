import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  extractDraftComponentsMethodMock: vi.fn(),
  loadFromChangedProjectMock: vi.fn(),
  loadFromFullProjectMock: vi.fn(),
  loadFromSelectedFilesMock: vi.fn(),
}))

vi.mock('../data-access/extraction-project/extraction-project-repository', () => ({
  ExtractionProjectRepository: class {
    loadFromChangedProject = mocks.loadFromChangedProjectMock
    loadFromFullProject = mocks.loadFromFullProjectMock
    loadFromSelectedFiles = mocks.loadFromSelectedFilesMock
  },
}))

import { ExtractDraftComponents } from './extract-draft-components'
import { ExtractionProjectRepository } from '../data-access/extraction-project/extraction-project-repository'
import { ExtractionConfigError } from '../domain/extraction-config-error'
import { ConnectionDetectionError } from '@living-architecture/riviere-extract-ts/features/extraction/domain/connection-detection/connection-detection-error'

const DRAFT_ONLY_RESULT = {
  kind: 'draftOnly' as const,
  components: [],
}

class UnexpectedLoadingError extends Error {}

describe('extractDraftComponents', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.loadFromChangedProjectMock.mockReturnValue({extractDraftComponents: mocks.extractDraftComponentsMethodMock,})
    mocks.loadFromFullProjectMock.mockReturnValue({extractDraftComponents: mocks.extractDraftComponentsMethodMock,})
    mocks.loadFromSelectedFilesMock.mockReturnValue({extractDraftComponents: mocks.extractDraftComponentsMethodMock,})
    mocks.extractDraftComponentsMethodMock.mockReturnValue(DRAFT_ONLY_RESULT)
  })

  describe('pull-request source mode', () => {
    it('loads from changed project with base branch when provided', () => {
      new ExtractDraftComponents(new ExtractionProjectRepository()).execute({
        allowIncomplete: false,
        baseBranch: 'main',
        configPath: 'config.yml',
        includeConnections: true,
        sourceMode: 'pull-request',
        useTsConfig: false,
      })

      expect(mocks.loadFromChangedProjectMock).toHaveBeenCalledWith({
        baseBranch: 'main',
        configPath: 'config.yml',
        useTsConfig: false,
      })
    })

    it('loads from changed project without base branch when not provided', () => {
      new ExtractDraftComponents(new ExtractionProjectRepository()).execute({
        allowIncomplete: false,
        configPath: 'config.yml',
        includeConnections: true,
        sourceMode: 'pull-request',
        useTsConfig: false,
      })

      expect(mocks.loadFromChangedProjectMock).toHaveBeenCalledWith({
        configPath: 'config.yml',
        useTsConfig: false,
      })
    })
  })

  describe('files source mode', () => {
    it('loads from selected files when files are provided', () => {
      new ExtractDraftComponents(new ExtractionProjectRepository()).execute({
        allowIncomplete: false,
        configPath: 'config.yml',
        files: ['src/foo.ts', 'src/bar.ts'],
        includeConnections: false,
        sourceMode: 'files',
        useTsConfig: true,
      })

      expect(mocks.loadFromSelectedFilesMock).toHaveBeenCalledWith({
        configPath: 'config.yml',
        filePaths: ['src/foo.ts', 'src/bar.ts'],
        useTsConfig: true,
      })
    })

    it('defaults filePaths to empty array when files is undefined', () => {
      new ExtractDraftComponents(new ExtractionProjectRepository()).execute({
        allowIncomplete: false,
        configPath: 'config.yml',
        includeConnections: false,
        sourceMode: 'files',
        useTsConfig: true,
      })

      expect(mocks.loadFromSelectedFilesMock).toHaveBeenCalledWith({
        configPath: 'config.yml',
        filePaths: [],
        useTsConfig: true,
      })
    })
  })

  describe('all source mode', () => {
    it('loads from full project', () => {
      new ExtractDraftComponents(new ExtractionProjectRepository()).execute({
        allowIncomplete: false,
        configPath: 'config.yml',
        includeConnections: true,
        sourceMode: 'all',
        useTsConfig: true,
      })

      expect(mocks.loadFromFullProjectMock).toHaveBeenCalledWith({
        configPath: 'config.yml',
        useTsConfig: true,
      })
    })
  })

  describe('result forwarding', () => {
    it('returns the extraction result', () => {
      const result = new ExtractDraftComponents(new ExtractionProjectRepository()).execute({
        allowIncomplete: true,
        configPath: 'config.yml',
        includeConnections: false,
        sourceMode: 'all',
        useTsConfig: false,
      })

      expect(result).toStrictEqual(DRAFT_ONLY_RESULT)
      expect(mocks.extractDraftComponentsMethodMock).toHaveBeenCalledWith({
        allowIncomplete: true,
        includeConnections: false,
      })
    })

    it('returns config failure when loading the extraction config fails', () => {
      mocks.loadFromFullProjectMock.mockImplementation(() => {
        throw new ExtractionConfigError('CONFIG_NOT_FOUND', 'Config file not found')
      })

      const result = new ExtractDraftComponents(new ExtractionProjectRepository()).execute({
        allowIncomplete: true,
        configPath: 'missing.yml',
        includeConnections: false,
        sourceMode: 'all',
        useTsConfig: false,
      })

      expect(result).toStrictEqual({
        code: 'CONFIG_NOT_FOUND',
        kind: 'configFailure',
        message: 'Config file not found',
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

      const result = new ExtractDraftComponents(new ExtractionProjectRepository()).execute({
        allowIncomplete: false,
        configPath: 'config.yml',
        includeConnections: true,
        sourceMode: 'all',
        useTsConfig: true,
      })

      expect(result).toStrictEqual({
        kind: 'connectionDetectionFailure',
        message: 'src/handler.ts:42: Could not resolve type — OrderService',
      })
    })

    it('rethrows unexpected loading errors', () => {
      mocks.loadFromFullProjectMock.mockImplementation(() => {
        throw new UnexpectedLoadingError('Unexpected failure')
      })

      expect(() =>
        new ExtractDraftComponents(new ExtractionProjectRepository()).execute({
          allowIncomplete: true,
          configPath: 'config.yml',
          includeConnections: false,
          sourceMode: 'all',
          useTsConfig: false,
        }),
      ).toThrow('Unexpected failure')
    })
  })
})
