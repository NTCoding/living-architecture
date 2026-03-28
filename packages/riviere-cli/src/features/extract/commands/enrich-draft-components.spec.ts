import {
  beforeEach, describe, expect, it, vi 
} from 'vitest'

const mocks = vi.hoisted(() => ({
  enrichDraftComponentsMethodMock: vi.fn(),
  loadFromDraftEnrichmentMock: vi.fn(),
}))

vi.mock('../infra/persistence/extraction-project/extraction-project-repository', () => ({
  ExtractionProjectRepository: class {
    loadFromDraftEnrichment = mocks.loadFromDraftEnrichmentMock
  },
}))

import { enrichDraftComponents } from './enrich-draft-components'

describe('enrichDraftComponents', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.loadFromDraftEnrichmentMock.mockReturnValue({enrichDraftComponents: mocks.enrichDraftComponentsMethodMock,})
    mocks.enrichDraftComponentsMethodMock.mockReturnValue({
      kind: 'draftOnly',
      components: [{ name: 'Draft' }],
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
    expect(mocks.enrichDraftComponentsMethodMock).toHaveBeenCalledWith({
      allowIncomplete: false,
      includeConnections: false,
    })
  })

  it('returns field failure when enrichment fails and incomplete output is disabled', () => {
    mocks.enrichDraftComponentsMethodMock.mockReturnValue({
      kind: 'fieldFailure',
      failedFields: ['fieldA'],
    })

    const result = enrichDraftComponents({
      allowIncomplete: false,
      configPath: 'config.yml',
      draftComponentsPath: 'draft.json',
      includeConnections: true,
      useTsConfig: true,
    })

    expect(result).toStrictEqual({
      kind: 'fieldFailure',
      failedFields: ['fieldA'],
    })
  })
})
