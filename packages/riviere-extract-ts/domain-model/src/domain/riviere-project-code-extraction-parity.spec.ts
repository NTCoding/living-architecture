import { assert, beforeEach, describe, expect, it, vi } from 'vitest'
import { Project } from 'ts-morph'
import { RiviereProject } from './riviere-project'
import { RiviereModule } from './riviere-module'
import { WorkflowStage } from './workflow-stage'
import { collaborators, configuration, component } from './__fixtures__/workflow-fixtures'
import { DraftComponent } from './component-extraction/draft-component'
import {
  EnrichedComponent,
  EnrichmentFailure,
  EnrichmentResult,
} from './value-extraction/enriched-component'
import { mustBeDefined } from '../__fixtures__/missing-test-fixture-error'
import type { LoadCodeExtraction } from './ports/load-code-extraction'
import {
  ExtractionProjectStartInput,
  GraphWithWorkflowStartInput,
  WorkflowStartInput,
} from './riviere-project-start-inputs'

const detection = vi.hoisted(() => ({ links: new Array<unknown>() }))

vi.mock('./connection-detection/call-graph/detect-connections-from-calls', () => ({
  detectConnectionsFromCalls: () => detection.links,
}))

const shared = configuration()
const lenient = configuration(undefined, true)

function codeExtractionConfig(source = shared) {
  const resolved = source.resolvedConfig
  return {
    modules: [mustBeDefined(resolved.modules[0], 'module')],
    connections: resolved.connections,
    schema: resolved.schema,
  }
}

function codeExtractionStage(name: string, source = shared): WorkflowStage {
  return WorkflowStage.fromMaterialized({
    kind: 'code-extraction',
    name,
    configPath: 'extraction.yml',
    config: codeExtractionConfig(source),
  })
}

function graphDefinition() {
  return {
    name: 'Shop',
    description: 'Shop graph',
    sources: [{ repository: 'shop' }],
    domains: { orders: { description: 'Orders', systemType: 'domain' } as const },
  }
}

function draft(): DraftComponent {
  return DraftComponent.parseOrThrow({
    type: 'useCase',
    name: 'PlaceOrder',
    location: { file: 'a.ts', line: 1 },
    domain: 'orders',
    module: 'orders',
  })
}

function enriched(name: string, missing?: string[]): EnrichedComponent {
  return EnrichedComponent.parse({
    type: 'useCase',
    name,
    location: { file: 'a.ts', line: 1 },
    domain: 'orders',
    module: 'orders',
    metadata: {},
    _missing: missing,
  })
}

function enrichment(...components: EnrichedComponent[]): EnrichmentResult {
  return EnrichmentResult.parse({ components, failures: [] })
}

function directProject(): RiviereProject {
  return RiviereProject.start(ExtractionProjectStartInput.from(shared, []), collaborators())
}

function workflowProject(
  stages: readonly WorkflowStage[],
  loader: LoadCodeExtraction = () => shared.moduleContexts,
): RiviereProject {
  const started = RiviereProject.start(
    GraphWithWorkflowStartInput.from(
      graphDefinition(),
      WorkflowStartInput.from({
        name: 'build-graph',
        outputPath: '/project/.riviere/graph.json',
        runLogDirectory: '/project/.riviere/logs',
        stages: [...stages],
      }),
    ),
    { ...collaborators(), loadCodeExtraction: loader },
  )
  return started
}

function componentIdentities(
  components: readonly { type: string; name: string; domain: string }[],
) {
  return components.map((value) => `${value.type.toLowerCase()}|${value.name}|${value.domain}`)
}

function reachableObjects(root: unknown): Set<unknown> {
  const seen = new Set<unknown>()
  const stack: unknown[] = [root]
  while (stack.length > 0) {
    const value = stack.pop()
    if (value === null || typeof value !== 'object') continue
    if (seen.has(value)) continue
    seen.add(value)
    for (const key of Object.keys(value)) {
      stack.push(Reflect.get(value, key))
    }
  }
  return seen
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(RiviereModule.prototype, 'draftComponents').mockReturnValue([draft()])
  detection.links = []
})

describe('code-extraction parity and composition', () => {
  it('produces the same component identities for direct extraction and a single stage', async () => {
    vi.spyOn(RiviereModule.prototype, 'enrichDraftComponents').mockReturnValue(
      enrichment(component('useCase', 'PlaceOrder'), component('useCase', 'ShipOrder')),
    )

    const direct = directProject().extractDraftComponents({
      allowIncomplete: false,
      includeConnections: true,
    })
    assert(direct.kind === 'full')

    const run = await workflowProject([codeExtractionStage('extract')]).rebuildGraph()
    assert(run.success)

    expect(componentIdentities(run.graph.components)).toStrictEqual(
      componentIdentities(direct.components),
    )
  })

  it('fails a stage when the same component is emitted twice and leaves the graph unchanged', async () => {
    vi.spyOn(RiviereModule.prototype, 'enrichDraftComponents').mockReturnValue(
      enrichment(component('useCase', 'PlaceOrder'), component('useCase', 'PlaceOrder')),
    )
    const project = workflowProject([codeExtractionStage('extract')])

    const run = await project.rebuildGraph()

    assert(!run.success)
    expect(run.errorCode).toBe('EXTRACTION_FIELD_FAILURE')
    expect(project.build().components).toStrictEqual([])
  })

  it('fails a stage when strict extraction has failing fields', async () => {
    vi.spyOn(RiviereModule.prototype, 'enrichDraftComponents').mockReturnValue(
      EnrichmentResult.parse({
        components: [],
        failures: [
          EnrichmentFailure.parse({ component: draft(), field: 'route', error: 'missing' }),
        ],
      }),
    )

    const run = await workflowProject([codeExtractionStage('extract')]).rebuildGraph()

    assert(!run.success)
    expect(run.errorCode).toBe('EXTRACTION_FIELD_FAILURE')
    expect(run.reason).toBe('Extraction failed for fields: route')
  })

  it('composes contributions from earlier completed stages', async () => {
    vi.spyOn(RiviereModule.prototype, 'enrichDraftComponents')
      .mockReturnValueOnce(enrichment(component('useCase', 'PlaceOrder')))
      .mockReturnValueOnce(enrichment(component('useCase', 'ShipOrder')))

    const run = await workflowProject([
      codeExtractionStage('extract-orders'),
      codeExtractionStage('extract-shipping'),
    ]).rebuildGraph()

    assert(run.success)
    expect(componentIdentities(run.graph.components)).toStrictEqual([
      'usecase|PlaceOrder|orders',
      'usecase|ShipOrder|orders',
    ])
  })

  it('turns lenient incomplete state into a workflow diagnostic keyed by canonical identity', async () => {
    vi.spyOn(RiviereModule.prototype, 'enrichDraftComponents').mockReturnValue(
      enrichment(enriched('PlaceOrder', ['route'])),
    )

    const run = await workflowProject(
      [codeExtractionStage('extract', lenient)],
      () => lenient.moduleContexts,
    ).rebuildGraph()

    assert(run.success)
    const diagnostics = run.transitions.flatMap((transition) => transition.value.state.diagnostics)
    expect(diagnostics.map((diagnostic) => diagnostic.value)).toContainEqual({
      kind: 'missing-field',
      componentId: 'PlaceOrder',
      field: 'route',
    })
  })

  it('honours the configuration allow-incomplete setting when no option is supplied', () => {
    vi.spyOn(RiviereModule.prototype, 'enrichDraftComponents').mockReturnValue(
      enrichment(enriched('PlaceOrder', ['route'])),
    )
    const started = RiviereProject.start(
      ExtractionProjectStartInput.from(lenient, []),
      collaborators(),
    )

    const result = started.extractDraftComponents({ includeConnections: true })

    assert(result.kind === 'full')
    expect(result.diagnostics).toHaveLength(1)
  })

  it('retains no parser project after five stages complete', async () => {
    vi.spyOn(RiviereModule.prototype, 'enrichDraftComponents').mockReturnValue(
      enrichment(component('useCase', 'PlaceOrder')),
    )
    const created = new Set<Project>()
    const loader: LoadCodeExtraction = () =>
      shared.moduleContexts.map((context) => {
        const project = new Project()
        created.add(project)
        return { module: context.module, files: context.files, project }
      })
    const project = workflowProject(
      [
        codeExtractionStage('one'),
        codeExtractionStage('two'),
        codeExtractionStage('three'),
        codeExtractionStage('four'),
        codeExtractionStage('five'),
      ],
      loader,
    )

    const run = await project.rebuildGraph()

    assert(run.success)
    const reachable = reachableObjects({ project, run })
    expect([...created].filter((candidate) => reachable.has(candidate))).toStrictEqual([])
  })
})
