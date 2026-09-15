import { describe, expect, it } from 'vitest'
import { executeCodeExtractionStage } from './execute-code-extraction-stage'
import { configuration, component } from '../__fixtures__/workflow-fixtures'
import { DraftComponent } from '../component-extraction/draft-component'
import type { CodeExtractionModules } from '../ports/code-extraction-modules'
import { EnrichmentFailure, EnrichmentResult, EnrichedComponent } from '../value-extraction/enriched-component'
import { ExtractedLink } from '../connection-detection/extracted-link'
import { mustBeDefined } from '../../__fixtures__/missing-test-fixture-error'

type StageInputs = Readonly<{
  extraction: ReturnType<typeof configuration>
}>

function stageInputs(allowIncomplete?: boolean): StageInputs {
  return {
    extraction: configuration(undefined, allowIncomplete),
  }
}

function modulePort(result: EnrichmentResult, hasDraftComponents = true): CodeExtractionModules {
  const draftComponents = hasDraftComponents ? [draftComponent()] : []
  return [
    {
      extractAllDraftComponents: () => undefined,
      draftComponents: () => draftComponents,
      owns: () => true,
      typeScriptProject: () => mustBeDefined(configuration().moduleContexts[0], 'module context').project,
      sourceFilePaths: () => [],
      enrichDraftComponents: () => result,
    },
  ]
}

function draftComponent(): DraftComponent {
  return DraftComponent.parseOrThrow({
    type: 'useCase',
    name: 'PlaceOrder',
    location: { file: 'a.ts', line: 1 },
    domain: 'orders',
    module: 'orders',
  })
}

function missingFieldComponent(): EnrichedComponent {
  return EnrichedComponent.parse({
    type: 'useCase',
    name: 'PlaceOrder',
    location: { file: 'a.ts', line: 1 },
    domain: 'orders',
    module: 'orders',
    metadata: {},
    _missing: ['route'],
  })
}

function enrichmentFailure(): EnrichmentFailure {
  return EnrichmentFailure.parse({
    component: draftComponent(),
    field: 'route',
    error: 'missing',
  })
}

const emptyEnrichment = EnrichmentResult.parse({ components: [], failures: [] })

describe('executeCodeExtractionStage', () => {
  it('extracts, enriches and returns components, links and diagnostics', () => {
    const uncertain = ExtractedLink.parse({
      source: 'a',
      target: 'b',
      type: 'sync',
      _uncertain: 'unresolved',
      sourceLocation: { repository: 'shop', filePath: 'a.ts' },
    })
    const uncertainWithoutLocation = ExtractedLink.parse({
      source: 'c',
      target: 'd',
      type: 'sync',
      _uncertain: 'unresolved',
    })
    const resolved = ExtractedLink.parse({ source: 'e', target: 'f', type: 'sync' })
    const enrichment = EnrichmentResult.parse({
      components: [missingFieldComponent(), component('useCase', 'ShipOrder')],
      failures: [],
    })

    const result = executeCodeExtractionStage({
      ...stageInputs(),
      createModules: () => modulePort(enrichment),
      detectConnections: () => ({
        links: [uncertain, uncertainWithoutLocation, resolved],
        externalLinks: [],
      }),
    })

    expect(result.diagnostics).toHaveLength(3)
  })

  it('throws when enrichment fails and allowIncomplete is not set', () => {
    const enrichment = EnrichmentResult.parse({
      components: [],
      failures: [enrichmentFailure()],
    })

    expect(() =>
      executeCodeExtractionStage({
        ...stageInputs(),
        createModules: () => modulePort(enrichment),
        detectConnections: () => ({ links: [], externalLinks: [] }),
      }),
    ).toThrowError('Extraction failed for fields: route')
  })

  it('continues despite failures when allowIncomplete is true', () => {
    const enrichment = EnrichmentResult.parse({
      components: [],
      failures: [enrichmentFailure()],
    })

    const result = executeCodeExtractionStage({
      ...stageInputs(true),
      createModules: () => modulePort(enrichment),
      detectConnections: (extraction, _modules, components, allowIncomplete) => {
        expect(extraction.repositoryName).toBe('shop')
        expect(allowIncomplete).toBe(true)
        expect(components).toStrictEqual([])
        return { links: [], externalLinks: [] }
      },
    })

    expect(result.components).toStrictEqual([])
  })

  it('skips modules that hold no draft components', () => {
    const result = executeCodeExtractionStage({
      ...stageInputs(),
      createModules: () => modulePort(emptyEnrichment, false),
      detectConnections: () => ({ links: [], externalLinks: [] }),
    })

    expect(result.components).toStrictEqual([])
  })
})
