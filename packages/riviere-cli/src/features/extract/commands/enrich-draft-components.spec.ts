import {
  beforeEach, describe, expect, it, vi 
} from 'vitest'
import { ExtractionFieldFailureError } from '../../../platform/infra/cli-presentation/error-codes'

const mocks = vi.hoisted(() => ({
  enrichDraftComponentsMethodMock: vi.fn(),
  loadProjectForDraftEnrichmentMock: vi.fn(),
}))

vi.mock('../infra/persistence/extraction-project/load-extraction-project', () => ({loadProjectForDraftEnrichment: mocks.loadProjectForDraftEnrichmentMock,}))

import { enrichDraftComponents } from './enrich-draft-components'

describe('enrichDraftComponents', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.loadProjectForDraftEnrichmentMock.mockReturnValue({enrichDraftComponents: mocks.enrichDraftComponentsMethodMock,})
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

  it('throws when enrichment fails and incomplete output is disabled', () => {
    mocks.enrichDraftComponentsMethodMock.mockImplementation(() => {
      throw new ExtractionFieldFailureError(['fieldA'])
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
