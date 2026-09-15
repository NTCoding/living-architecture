import { assert, describe, expect, it } from 'vitest'
import { Project } from 'ts-morph'
import { extractCodeExtraction } from './extract-code-extraction'
import { CodeExtractionModules } from '../ports/code-extraction-modules'
import { DraftComponent } from '../component-extraction/draft-component'
import { ExtractedLink } from '../connection-detection/extracted-link'
import { EnrichedComponent, EnrichmentFailure } from '../value-extraction/enriched-component'
import { configuration } from '../__fixtures__/workflow-fixtures'

function draft(): DraftComponent {
  return DraftComponent.parseOrThrow({
    type: 'useCase',
    name: 'PlaceOrder',
    location: { file: 'a.ts', line: 1 },
    domain: 'orders',
    module: 'orders',
  })
}

function enriched(missing: string[]): EnrichedComponent {
  return EnrichedComponent.parse({
    type: 'useCase',
    name: 'PlaceOrder',
    location: { file: 'a.ts', line: 1 },
    domain: 'orders',
    module: 'orders',
    metadata: {},
    _missing: missing,
  })
}

function failure(field: string): EnrichmentFailure {
  return EnrichmentFailure.parse({ component: draft(), field, error: 'missing' })
}

function modulesPort(
  components: readonly EnrichedComponent[],
  failures: readonly EnrichmentFailure[] = [],
): CodeExtractionModules {
  const project = new Project()
  return CodeExtractionModules.from([
    {
      extractAllDraftComponents: () => undefined,
      draftComponents: () => [draft()],
      owns: () => true,
      typeScriptProject: () => project,
      sourceFilePaths: () => [],
      enrichDraftComponents: () => ({ components: [...components], failures: [...failures] }),
    },
  ])
}

const noLinks = () => ({ links: [], externalLinks: [] })

describe('extractCodeExtraction', () => {
  it('reports a diagnostic for every missing field and uncertain link', () => {
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
      _uncertain: 'unresolved',
    })
    const resolved = ExtractedLink.parse({ source: 'e', target: 'f', type: 'sync' })

    const result = extractCodeExtraction({
      extraction: configuration(undefined, true),
      modules: modulesPort([enriched(['route', 'operationName'])]),
      detectConnections: () => ({
        links: [resolved, uncertain, uncertainWithoutLocation],
        externalLinks: [],
      }),
    })

    assert(result.kind === 'full')
    expect(result.diagnostics.map((diagnostic) => diagnostic.value)).toStrictEqual([
      { kind: 'missing-field', componentId: 'PlaceOrder', field: 'route' },
      { kind: 'missing-field', componentId: 'PlaceOrder', field: 'operationName' },
      {
        kind: 'uncertain-link',
        source: 'a',
        target: 'b',
        sourceLocation: { repository: 'shop', filePath: 'a.ts' },
      },
      { kind: 'uncertain-link', source: 'c', target: 'd' },
    ])
  })

  it('fails with the deduplicated field names when failures are not tolerated', () => {
    const result = extractCodeExtraction({
      extraction: configuration(),
      modules: modulesPort([enriched([])], [failure('route'), failure('route'), failure('name')]),
      detectConnections: noLinks,
    })

    expect(result).toStrictEqual({
      kind: 'fieldFailure',
      failedFields: ['route', 'name'],
    })
  })

  it('continues with the failed field names when failures are tolerated', () => {
    const result = extractCodeExtraction({
      extraction: configuration(undefined, true),
      modules: modulesPort([enriched([])], [failure('route')]),
      detectConnections: noLinks,
    })

    assert(result.kind === 'full')
    expect(result.failedFields).toStrictEqual(['route'])
    expect(result.components).toHaveLength(1)
  })
})
