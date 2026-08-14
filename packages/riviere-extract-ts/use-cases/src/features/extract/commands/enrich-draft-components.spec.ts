import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  enrichDraftComponentsMethodMock: vi.fn(),
  loadFromDraftEnrichmentMock: vi.fn(),
}))

vi.mock('../data-access/extraction-project/extraction-project-repository', () => ({
  ExtractionProjectRepository: class {
    loadFromDraftEnrichment = mocks.loadFromDraftEnrichmentMock
  },
}))

import { EnrichDraftComponents } from './enrich-draft-components'
import { ExtractionProjectRepository } from '../data-access/extraction-project/extraction-project-repository'
import { ExtractionConfigError } from '../data-access/extraction-project/extraction-config-error'
import { ExtractionDataAccessError } from '../data-access/extraction-project/extraction-project-error'
import { ConnectionDetectionError } from '@living-architecture/riviere-extract-ts-domain-model/domain/connection-detection/connection-detection-error'

class UnexpectedLoadingError extends Error {}

describe('enrichDraftComponents', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.loadFromDraftEnrichmentMock.mockReturnValue({
      enrichDraftComponents: mocks.enrichDraftComponentsMethodMock,
    })
    mocks.enrichDraftComponentsMethodMock.mockReturnValue({
      kind: 'draftOnly',
      components: [{ name: 'Draft' }],
    })
  })

  it('returns draft-only results when connections are disabled', () => {
    const result = new EnrichDraftComponents(new ExtractionProjectRepository()).execute({
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

    const result = new EnrichDraftComponents(new ExtractionProjectRepository()).execute({
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

  it('returns config failure when loading the extraction config fails', () => {
    mocks.loadFromDraftEnrichmentMock.mockImplementation(() => {
      throw new ExtractionConfigError('VALIDATION_ERROR', 'Invalid extraction config')
    })

    const result = new EnrichDraftComponents(new ExtractionProjectRepository()).execute({
      allowIncomplete: false,
      configPath: 'config.yml',
      draftComponentsPath: 'draft.json',
      includeConnections: true,
      useTsConfig: true,
    })

    expect(result).toStrictEqual({
      code: 'VALIDATION_ERROR',
      kind: 'configFailure',
      message: 'Invalid extraction config',
    })
  })

  it('returns connection detection failure from enrichment', () => {
    mocks.enrichDraftComponentsMethodMock.mockImplementation(() => {
      throw new ConnectionDetectionError({
        file: 'src/handler.ts',
        line: 42,
        reason: 'Could not resolve type',
        typeName: 'OrderService',
      })
    })

    const result = new EnrichDraftComponents(new ExtractionProjectRepository()).execute({
      allowIncomplete: false,
      configPath: 'config.yml',
      draftComponentsPath: 'draft.json',
      includeConnections: true,
      useTsConfig: true,
    })

    expect(result).toStrictEqual({
      kind: 'connectionDetectionFailure',
      message: 'src/handler.ts:42: Could not resolve type — OrderService',
    })
  })

  it('returns data access failure when loading the extraction project fails', () => {
    mocks.loadFromDraftEnrichmentMock.mockImplementation(() => {
      throw new ExtractionDataAccessError('FILE_READ_ERROR', 'Could not read draft components')
    })

    const result = new EnrichDraftComponents(new ExtractionProjectRepository()).execute({
      allowIncomplete: false,
      configPath: 'config.yml',
      draftComponentsPath: 'draft.json',
      includeConnections: true,
      useTsConfig: true,
    })

    expect(result).toStrictEqual({
      code: 'FILE_READ_ERROR',
      kind: 'dataAccessFailure',
      message: 'Could not read draft components',
    })
  })

  it('rethrows unexpected loading errors', () => {
    mocks.loadFromDraftEnrichmentMock.mockImplementation(() => {
      throw new UnexpectedLoadingError('Unexpected failure')
    })

    expect(() =>
      new EnrichDraftComponents(new ExtractionProjectRepository()).execute({
        allowIncomplete: false,
        configPath: 'config.yml',
        draftComponentsPath: 'draft.json',
        includeConnections: true,
        useTsConfig: true,
      }),
    ).toThrow('Unexpected failure')
  })
})
