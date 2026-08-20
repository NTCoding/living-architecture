import { assert, beforeEach, describe, expect, it, vi } from 'vitest'
import { Project } from 'ts-morph'
import { ValidatedConfiguration } from '@living-architecture/riviere-extract-config-published-language'
import type { RiviereGraph } from '@living-architecture/riviere-schema-published-language/schema'
import { EnrichedComponent } from './value-extraction/enriched-component'
import { ExtractionStage } from './extraction-stage'
import { WorkflowStage } from './workflow-state'

const { extract, detect } = vi.hoisted(() => ({ extract: vi.fn(), detect: vi.fn() }))

vi.mock('./extract-components-for-graph', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./extract-components-for-graph')>()
  return {
    ...actual,
    ExtractComponentsForGraph: class {
      execute = extract
    },
  }
})

vi.mock('./detect-extraction-connections', () => ({
  DetectExtractionConnections: class {
    execute = detect
  },
}))

import { RiviereProject } from './riviere-project'

const graph: RiviereGraph = {
  version: '1.0',
  metadata: { domains: {}, sources: [] },
  components: [],
  links: [],
  externalLinks: [],
}

function stage(name: string): ExtractionStage {
  const configuration = ValidatedConfiguration.parse({
    modules: [
      {
        name: 'orders',
        domain: 'orders',
        path: '.',
        glob: '*.ts',
        api: { notUsed: true },
        useCase: { notUsed: true },
        domainOp: { notUsed: true },
        event: { notUsed: true },
        eventHandler: { notUsed: true },
        ui: { notUsed: true },
      },
    ],
  })
  assert(configuration.success)
  return ExtractionStage.parse({
    name,
    configPath: `${name}.yml`,
    useTsConfig: false,
    repositoryName: 'shop',
    resolvedConfig: configuration.data,
    moduleContexts: configuration.data.modules.map((module) => ({
      module,
      files: [],
      project: new Project(),
    })),
  })
}

function component(name: string): EnrichedComponent {
  return EnrichedComponent.parse({
    type: 'useCase',
    name,
    domain: 'orders',
    module: 'orders',
    location: { file: 'orders.ts', line: 1 },
    metadata: {},
    _missing: undefined,
  })
}

function graphBuilder(events: string[]) {
  return {
    addComponents: (_repository: string, components: readonly EnrichedComponent[]) =>
      events.push(`components:${components.map((item) => item.name).join(',')}`),
    addLinks: () => events.push('links'),
    validate: () => events.push('validate'),
    build: () => {
      events.push('build')
      return graph
    },
  }
}

describe('RiviereProject.rebuildGraph', () => {
  beforeEach(() => {
    extract.mockReset()
    detect.mockReset()
  })

  it('runs ordered extract, link, validate stages against accumulated components', () => {
    const first = stage('first')
    const second = stage('second')
    const parsed = RiviereProject.parseWorkflow({
      graph: { domains: {}, outputPath: 'graph.json', sources: [{ repository: 'shop' }] },
      runLogDirectory: 'logs',
      stages: [
        WorkflowStage.parse({ kind: 'extract', stage: first }),
        WorkflowStage.parse({ kind: 'extract', stage: second }),
        WorkflowStage.parse({ kind: 'link', stage: second }),
        WorkflowStage.parse({ kind: 'validate' }),
      ],
    })
    assert(parsed.success)
    const extractionOptions: { allowIncomplete: boolean }[] = []
    const extractionResults = [
      { ok: true as const, repository: 'shop', components: [component('First')], failedFields: [] },
      { ok: true as const, repository: 'shop', components: [component('Second')], failedFields: [] },
    ]
    const linkedComponents: string[] = []
    extract.mockImplementation((_stage: unknown, options: { allowIncomplete: boolean }) => {
      extractionOptions.push(options)
      return extractionResults.shift()
    })
    detect.mockImplementation((_stage: unknown, components: readonly EnrichedComponent[]) => {
      linkedComponents.push(...components.map((item) => item.name))
      return { links: [], externalLinks: [] }
    })
    const events: string[] = []

    const result = parsed.data.rebuildGraph(graphBuilder(events))

    expect({
      result,
      events,
      extractOptions: extractionOptions,
      linkedComponents,
    }).toStrictEqual({
      result: { ok: true, graph },
      events: ['components:First', 'components:Second', 'links', 'validate', 'build'],
      extractOptions: [{ allowIncomplete: false }, { allowIncomplete: false }],
      linkedComponents: ['First', 'Second'],
    })
  })

  it('returns an extraction failure and does not run later stages', () => {
    const parsed = RiviereProject.parse({ stage: stage('main') })
    assert(parsed.success)
    extract.mockReturnValue({ ok: false, failure: { reason: 'Field enrichment failed', failedFields: ['route'] } })
    const events: string[] = []

    const result = parsed.data.rebuildGraph(graphBuilder(events))

    expect({ result, events, detectCalls: detect.mock.calls.length }).toStrictEqual({
      result: { ok: false, failure: { reason: 'Field enrichment failed', failedFields: ['route'] } },
      events: [],
      detectCalls: 0,
    })
  })

  it('rejects a workflow without an extract stage', () => {
    const parsed = RiviereProject.parseWorkflow({
      graph: { domains: {}, outputPath: 'graph.json', sources: [{ repository: 'shop' }] },
      runLogDirectory: 'logs',
      stages: [WorkflowStage.parse({ kind: 'validate' })],
    })

    expect(parsed).toStrictEqual({ success: false, error: 'Workflow must contain an extract stage' })
  })

  it('returns the first extraction stage validation failure', () => {
    const invalidStage = stage('invalid')
    Object.assign(invalidStage, { moduleContexts: [] })

    const parsed = RiviereProject.parseWorkflow({
      graph: { domains: {}, outputPath: 'graph.json', sources: [{ repository: 'shop' }] },
      runLogDirectory: 'logs',
      stages: [WorkflowStage.parse({ kind: 'extract', stage: invalidStage })],
    })

    expect(parsed).toStrictEqual({ success: false, error: "Missing source for module 'orders'" })
  })
})
