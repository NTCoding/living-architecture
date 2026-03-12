import {
  beforeEach, describe, expect, it, vi 
} from 'vitest'
import { ExtractionFieldFailureError } from '../../../platform/infra/cli-presentation/error-codes'

const mocks = vi.hoisted(() => ({
  detectConnectionsMock: vi.fn(),
  enrichDraftComponentsMethodMock: vi.fn(),
  getRepositoryInfoMock: vi.fn(),
  loadAndValidateConfigMock: vi.fn(),
  loadDraftComponentsFromFileMock: vi.fn(),
  loadExtractionProjectMock: vi.fn(),
  resolveSourceFilesMock: vi.fn(),
}))

vi.mock('../../../platform/infra/extraction-config/config-loader', () => ({
  loadAndValidateConfig: mocks.loadAndValidateConfigMock,
  resolveSourceFiles: mocks.resolveSourceFilesMock,
}))

vi.mock('../../../platform/infra/extraction-config/draft-component-loader', () => ({loadDraftComponentsFromFile: mocks.loadDraftComponentsFromFileMock,}))

vi.mock('../../../platform/infra/git/git-repository-info', () => ({getRepositoryInfo: mocks.getRepositoryInfoMock,}))

vi.mock('../infra/repositories/load-extraction-project', () => ({loadExtractionProject: mocks.loadExtractionProjectMock,}))

import { enrichDraftComponents } from './enrich-draft-components'

describe('enrichDraftComponents', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.loadAndValidateConfigMock.mockReturnValue({
      configDir: '/repo',
      resolvedConfig: { modules: [] },
    })
    mocks.resolveSourceFilesMock.mockReturnValue(['/repo/src/a.ts'])
    mocks.loadDraftComponentsFromFileMock.mockReturnValue([{ name: 'Draft' }])
    mocks.loadExtractionProjectMock.mockReturnValue({
      detectConnections: mocks.detectConnectionsMock,
      enrichDraftComponents: mocks.enrichDraftComponentsMethodMock,
    })
    mocks.getRepositoryInfoMock.mockReturnValue({ name: 'repo/name' })
    mocks.enrichDraftComponentsMethodMock.mockReturnValue({
      components: [{ name: 'Comp' }],
      failedFields: [],
    })
    mocks.detectConnectionsMock.mockReturnValue({
      links: [
        {
          from: 'a',
          to: 'b',
        },
      ],
      timings: [],
    })
  })

  it('returns draft-only results when connections are disabled', () => {
    const result = enrichDraftComponents({
      allowIncomplete: false,
      configPath: 'config.yml',
      draftComponentsPath: 'draft.json',
      includeConnections: false,
      useTsConfig: true,
    })

    expect(result).toStrictEqual({
      kind: 'draftOnly',
      components: [{ name: 'Draft' }],
    })
    expect(mocks.enrichDraftComponentsMethodMock).not.toHaveBeenCalled()
  })

  it('throws when enrichment fails and incomplete output is disabled', () => {
    mocks.enrichDraftComponentsMethodMock.mockReturnValue({
      components: [],
      failedFields: ['fieldA'],
    })

    expect(() =>
      enrichDraftComponents({
        allowIncomplete: false,
        configPath: 'config.yml',
        draftComponentsPath: 'draft.json',
        includeConnections: true,
        useTsConfig: true,
      }),
    ).toThrowError(new ExtractionFieldFailureError(['fieldA']))
  })
})
