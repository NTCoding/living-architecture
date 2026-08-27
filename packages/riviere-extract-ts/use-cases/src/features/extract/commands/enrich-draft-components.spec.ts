import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  enrichDraftComponentsMethodMock: vi.fn(),
  loadMock: vi.fn(),
}))

vi.mock('../data-access/riviere-project/riviere-project-repository', () => ({
  RiviereProjectRepository: class {
    loadForEnrichment = mocks.loadMock
  },
}))

import { EnrichDraftComponents } from './enrich-draft-components'
import { RiviereProjectRepository } from '../data-access/riviere-project/riviere-project-repository'
import { ExtractionConfigError } from '../data-access/riviere-project/riviere-config-error'
import { ExtractionDataAccessError } from '../data-access/riviere-project/riviere-project-error'
import { ConnectionDetectionError } from '@living-architecture/riviere-extract-ts-domain-model/domain/connection-detection/connection-detection-error'
import { DraftComponentsLoadError } from '../data-access/riviere-project/draft-components-load-error'

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
    const result = new EnrichDraftComponents(new RiviereProjectRepository(), () => 0).execute({
      allowIncomplete: false,
      configPath: 'config.yml',
      draftComponentsPath: 'draft.json',
      includeConnections: false,
      useTsConfig: true,
    })

    expect(result).toStrictEqual({
      result: {
        kind: 'draftOnly',
        components: [{ name: 'Draft' }],
      },
    })
    expect(mocks.enrichDraftComponentsMethodMock).toHaveBeenCalledWith({
      allowIncomplete: false,
      includeConnections: false,
      observeConnectionDetectionPhase: expect.any(Function),
    })
  })

  it('measures connection detection phases outside the aggregate', () => {
    mocks.enrichDraftComponentsMethodMock.mockImplementation(
      (options: {
        observeConnectionDetectionPhase: (event: {
          phase: 'setup' | 'callGraph' | 'detection' | 'total'
          status: 'started' | 'completed'
        }) => void
      }) => {
        const observe = options.observeConnectionDetectionPhase
        observe({ phase: 'total', status: 'started' })
        observe({ phase: 'setup', status: 'started' })
        observe({ phase: 'setup', status: 'completed' })
        observe({ phase: 'callGraph', status: 'started' })
        observe({ phase: 'callGraph', status: 'completed' })
        observe({ phase: 'detection', status: 'started' })
        observe({ phase: 'detection', status: 'completed' })
        observe({ phase: 'total', status: 'completed' })
        return {
          kind: 'full',
          components: [],
          failedFields: [],
          links: [],
          externalLinks: [],
        }
      },
    )
    const times = [0, 2, 5, 7, 13, 17, 25, 30]

    const result = new EnrichDraftComponents(
      new RiviereProjectRepository(),
      () => times.shift() ?? 0,
    ).execute({
      allowIncomplete: false,
      configPath: 'config.yml',
      draftComponentsPath: 'draft.json',
      includeConnections: true,
      useTsConfig: true,
    })

    expect(result.result).toMatchObject({
      kind: 'full',
      timings: [{ setupMs: 3, callGraphMs: 6, asyncDetectionMs: 8, totalMs: 30 }],
    })
  })

  it('records zero for phases that did not start', () => {
    mocks.enrichDraftComponentsMethodMock.mockImplementation(
      (options: {
        observeConnectionDetectionPhase: (event: {
          phase: 'setup' | 'callGraph' | 'detection' | 'total'
          status: 'started' | 'completed'
        }) => void
      }) => {
        const observe = options.observeConnectionDetectionPhase
        observe({ phase: 'setup', status: 'completed' })
        observe({ phase: 'callGraph', status: 'completed' })
        observe({ phase: 'detection', status: 'completed' })
        observe({ phase: 'total', status: 'completed' })
        return {
          kind: 'full',
          components: [],
          failedFields: [],
          links: [],
          externalLinks: [],
        }
      },
    )

    const result = new EnrichDraftComponents(new RiviereProjectRepository(), () => 10).execute({
      allowIncomplete: false,
      configPath: 'config.yml',
      draftComponentsPath: 'draft.json',
      includeConnections: true,
      useTsConfig: true,
    })

    expect(result.result).toMatchObject({
      kind: 'full',
      timings: [{ setupMs: 0, callGraphMs: 0, asyncDetectionMs: 0, totalMs: 0 }],
    })
  })

  it('passes the draft components path to the repository', () => {
    new EnrichDraftComponents(new RiviereProjectRepository(), () => 0).execute({
      allowIncomplete: false,
      configPath: 'config.yml',
      draftComponentsPath: 'draft.json',
      includeConnections: false,
      useTsConfig: true,
    })

    expect(mocks.loadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        draftComponentsPath: 'draft.json',
      }),
    )
  })

  it('returns the requested output path with a successful result', () => {
    const result = new EnrichDraftComponents(new RiviereProjectRepository(), () => 0).execute({
      allowIncomplete: false,
      configPath: 'config.yml',
      draftComponentsPath: 'draft.json',
      includeConnections: false,
      output: 'enriched.json',
      useTsConfig: true,
    })

    expect(result).toStrictEqual({
      outputPath: 'enriched.json',
      result: { components: [{ name: 'Draft' }], kind: 'draftOnly' },
    })
  })

  it('does not put draft components in command input', () => {
    new EnrichDraftComponents(new RiviereProjectRepository(), () => 0).execute({
      allowIncomplete: false,
      configPath: 'config.yml',
      draftComponentsPath: 'draft.json',
      includeConnections: false,
      useTsConfig: true,
    })

    expect(mocks.enrichDraftComponentsMethodMock).toHaveBeenCalledWith(
      expect.not.objectContaining({ draftComponentsPath: 'draft.json' }),
    )
  })

  it('returns field failure when enrichment fails and incomplete output is disabled', () => {
    mocks.enrichDraftComponentsMethodMock.mockReturnValue({
      kind: 'fieldFailure',
      failedFields: ['fieldA'],
    })

    const result = new EnrichDraftComponents(new RiviereProjectRepository(), () => 0).execute({
      allowIncomplete: false,
      configPath: 'config.yml',
      draftComponentsPath: 'draft.json',
      includeConnections: true,
      useTsConfig: true,
    })

    expect(result).toStrictEqual({
      result: {
        kind: 'fieldFailure',
        failedFields: ['fieldA'],
      },
    })
  })

  it('returns config failure when loading the extraction config fails', () => {
    mocks.loadMock.mockImplementation(() => {
      throw new ExtractionConfigError('VALIDATION_ERROR', 'Invalid extraction config')
    })

    const result = new EnrichDraftComponents(new RiviereProjectRepository(), () => 0).execute({
      allowIncomplete: false,
      configPath: 'config.yml',
      draftComponentsPath: 'draft.json',
      includeConnections: true,
      useTsConfig: true,
    })

    expect(result).toStrictEqual({
      result: {
        code: 'VALIDATION_ERROR',
        kind: 'configFailure',
        message: 'Invalid extraction config',
      },
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

    const result = new EnrichDraftComponents(new RiviereProjectRepository(), () => 0).execute({
      allowIncomplete: false,
      configPath: 'config.yml',
      draftComponentsPath: 'draft.json',
      includeConnections: true,
      useTsConfig: true,
    })

    expect(result).toStrictEqual({
      result: {
        kind: 'connectionDetectionFailure',
        message: 'src/handler.ts:42: Could not resolve type — OrderService',
      },
    })
  })

  it('returns data access failure when loading the extraction project fails', () => {
    mocks.loadMock.mockImplementation(() => {
      throw new ExtractionDataAccessError('FILE_READ_ERROR', 'Could not read draft components')
    })

    const result = new EnrichDraftComponents(new RiviereProjectRepository(), () => 0).execute({
      allowIncomplete: false,
      configPath: 'config.yml',
      draftComponentsPath: 'draft.json',
      includeConnections: true,
      useTsConfig: true,
    })

    expect(result).toStrictEqual({
      result: {
        code: 'FILE_READ_ERROR',
        kind: 'dataAccessFailure',
        message: 'Could not read draft components',
      },
    })
  })

  it('returns draft components failure when the repository cannot restore drafts', () => {
    mocks.loadMock.mockImplementation(() => {
      throw new DraftComponentsLoadError('Invalid draft components')
    })

    const result = new EnrichDraftComponents(new RiviereProjectRepository(), () => 0).execute({
      allowIncomplete: false,
      configPath: 'config.yml',
      draftComponentsPath: 'draft.json',
      includeConnections: true,
      useTsConfig: true,
    })

    expect(result).toStrictEqual({
      result: {
        kind: 'draftComponentsFailure',
        message: 'Invalid draft components',
      },
    })
  })

  it('rethrows unexpected loading errors', () => {
    mocks.loadMock.mockImplementation(() => {
      throw new UnexpectedLoadingError('Unexpected failure')
    })

    expect(() =>
      new EnrichDraftComponents(new RiviereProjectRepository(), () => 0).execute({
        allowIncomplete: false,
        configPath: 'config.yml',
        draftComponentsPath: 'draft.json',
        includeConnections: true,
        useTsConfig: true,
      }),
    ).toThrow('Unexpected failure')
  })
})
