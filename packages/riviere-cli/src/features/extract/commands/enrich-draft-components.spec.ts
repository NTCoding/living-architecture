import {
  beforeEach, describe, expect, it, vi 
} from 'vitest'
import { ExtractionFieldFailureError } from '../../../platform/infra/cli-presentation/error-codes'

const mocks = vi.hoisted(() => ({
  createModuleContextsMock: vi.fn(),
  detectConnectionsPerModuleMock: vi.fn(),
  enrichPerModuleMock: vi.fn(),
  getRepositoryInfoMock: vi.fn(),
  loadAndValidateConfigMock: vi.fn(),
  loadDraftComponentsFromFileMock: vi.fn(),
  resolveSourceFilesMock: vi.fn(),
}))

vi.mock('../../../platform/infra/extraction-config/config-loader', () => ({
  loadAndValidateConfig: mocks.loadAndValidateConfigMock,
  resolveSourceFiles: mocks.resolveSourceFilesMock,
}))

vi.mock('../../../platform/infra/extraction-config/draft-component-loader', () => ({loadDraftComponentsFromFile: mocks.loadDraftComponentsFromFileMock,}))

vi.mock('../../../platform/infra/git/git-repository-info', () => ({getRepositoryInfo: mocks.getRepositoryInfoMock,}))

vi.mock('../infra/external-clients/create-module-contexts', () => ({createModuleContexts: mocks.createModuleContextsMock,}))

vi.mock('../domain/enrich-per-module', () => ({enrichPerModule: mocks.enrichPerModuleMock,}))

vi.mock('../domain/detect-connections-per-module', () => ({detectConnectionsPerModule: mocks.detectConnectionsPerModuleMock,}))

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
    mocks.createModuleContextsMock.mockReturnValue([{ module: { name: 'mod' } }])
    mocks.getRepositoryInfoMock.mockReturnValue({ name: 'repo/name' })
    mocks.enrichPerModuleMock.mockReturnValue({
      components: [{ name: 'Comp' }],
      failedFields: [],
    })
    mocks.detectConnectionsPerModuleMock.mockReturnValue({
      links: [{
        from: 'a',
        to: 'b' 
      }],
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
    expect(mocks.enrichPerModuleMock).not.toHaveBeenCalled()
  })

  it('throws when enrichment fails and incomplete output is disabled', () => {
    mocks.enrichPerModuleMock.mockReturnValue({
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
