import {
  beforeEach, describe, expect, it, vi 
} from 'vitest'

const mocks = vi.hoisted(() => ({
  extractDraftComponentsMethodMock: vi.fn(),
  loadFromChangedProjectMock: vi.fn(),
  loadFromFullProjectMock: vi.fn(),
  loadFromSelectedFilesMock: vi.fn(),
}))

vi.mock('../infra/persistence/extraction-project/extraction-project-repository', () => ({
  ExtractionProjectRepository: class {
    loadFromChangedProject = mocks.loadFromChangedProjectMock
    loadFromFullProject = mocks.loadFromFullProjectMock
    loadFromSelectedFiles = mocks.loadFromSelectedFilesMock
  },
}))

import { extractDraftComponents } from './extract-draft-components'

const DRAFT_ONLY_RESULT = {
  kind: 'draftOnly' as const,
  components: [],
}

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
      extractDraftComponents({
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
      extractDraftComponents({
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
      extractDraftComponents({
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
      extractDraftComponents({
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
      extractDraftComponents({
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
      const result = extractDraftComponents({
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
  })
})
