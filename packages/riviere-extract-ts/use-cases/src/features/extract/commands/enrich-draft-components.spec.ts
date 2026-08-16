import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  enrichDraftComponentsMethodMock: vi.fn(),
  loadMock: vi.fn(),
}))

vi.mock('../data-access/riviere-project/riviere-project-repository', () => ({
  RiviereProjectRepository: class {
    load = mocks.loadMock
  },
}))

import { EnrichDraftComponents } from './enrich-draft-components'
import { RiviereProjectRepository } from '../data-access/riviere-project/riviere-project-repository'
import { ExtractionConfigError } from '../data-access/riviere-project/riviere-config-error'
import { ExtractionDataAccessError } from '../data-access/riviere-project/riviere-project-error'
import { ConnectionDetectionError } from '@living-architecture/riviere-extract-ts-domain-model/domain/connection-detection/connection-detection-error'

class UnexpectedLoadingError extends Error {}

describe('enrichDraftComponents', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.loadMock.mockReturnValue({
      enrichDraftComponents: mocks.enrichDraftComponentsMethodMock,
    })
    mocks.enrichDraftComponentsMethodMock.mockReturnValue({
      kind: 'draftOnly',
      components: [{ name: 'Draft' }],
    })
  })

  it('returns draft-only results when connections are disabled', () => {
    const result = new EnrichDraftComponents(new RiviereProjectRepository()).execute({
      allowIncomplete: false,
      configPath: 'config.yml',
      draftComponents: [],
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
      draftComponents: [],
      includeConnections: false,
    })
  })

  it('parses draft component input before invoking the aggregate', () => {
    new EnrichDraftComponents(new RiviereProjectRepository()).execute({
      allowIncomplete: false,
      configPath: 'config.yml',
      draftComponents: [
        {
          type: 'useCase',
          name: 'PlaceOrder',
          location: { file: 'src/order.ts', line: 1 },
          domain: 'orders',
          module: 'orders',
        },
      ],
      draftComponentsPath: 'draft.json',
      includeConnections: false,
      useTsConfig: true,
    })

    expect(mocks.enrichDraftComponentsMethodMock).toHaveBeenCalledWith(
      expect.objectContaining({
        draftComponents: [expect.objectContaining({ name: 'PlaceOrder' })],
      }),
    )
  })

  it('uses an empty draft list when the input has no draft components', () => {
    new EnrichDraftComponents(new RiviereProjectRepository()).execute({
      allowIncomplete: false,
      configPath: 'config.yml',
      draftComponentsPath: 'draft.json',
      includeConnections: false,
      useTsConfig: true,
    })

    expect(mocks.enrichDraftComponentsMethodMock).toHaveBeenCalledWith(
      expect.objectContaining({ draftComponents: [] }),
    )
  })

  it('returns field failure when enrichment fails and incomplete output is disabled', () => {
    mocks.enrichDraftComponentsMethodMock.mockReturnValue({
      kind: 'fieldFailure',
      failedFields: ['fieldA'],
    })

    const result = new EnrichDraftComponents(new RiviereProjectRepository()).execute({
      allowIncomplete: false,
      configPath: 'config.yml',
      draftComponents: [],
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
    mocks.loadMock.mockImplementation(() => {
      throw new ExtractionConfigError('VALIDATION_ERROR', 'Invalid extraction config')
    })

    const result = new EnrichDraftComponents(new RiviereProjectRepository()).execute({
      allowIncomplete: false,
      configPath: 'config.yml',
      draftComponents: [],
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

    const result = new EnrichDraftComponents(new RiviereProjectRepository()).execute({
      allowIncomplete: false,
      configPath: 'config.yml',
      draftComponents: [],
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
    mocks.loadMock.mockImplementation(() => {
      throw new ExtractionDataAccessError('FILE_READ_ERROR', 'Could not read draft components')
    })

    const result = new EnrichDraftComponents(new RiviereProjectRepository()).execute({
      allowIncomplete: false,
      configPath: 'config.yml',
      draftComponents: [],
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
    mocks.loadMock.mockImplementation(() => {
      throw new UnexpectedLoadingError('Unexpected failure')
    })

    expect(() =>
      new EnrichDraftComponents(new RiviereProjectRepository()).execute({
        allowIncomplete: false,
        configPath: 'config.yml',
        draftComponents: [],
        draftComponentsPath: 'draft.json',
        includeConnections: true,
        useTsConfig: true,
      }),
    ).toThrow('Unexpected failure')
  })
})
