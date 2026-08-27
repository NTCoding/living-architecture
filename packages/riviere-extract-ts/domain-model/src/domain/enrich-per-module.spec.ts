import { assert, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'
import { Project } from 'ts-morph'
import {
  type ComponentRuleInput,
  ValidatedConfiguration,
  ValidatedModule,
  type ValidatedModuleInput,
} from '@living-architecture/riviere-extract-config-published-language'
import { DraftComponent } from './component-extraction/draft-component'
import { RiviereProject, OrphanedDraftComponentError } from './riviere-project'
import { RiviereModule } from './riviere-module'
import { ExtractionConfiguration } from './extraction-configuration'
import { TestFixtureError } from './value-extraction/literal-detection'
import {
  EnrichedComponent,
  EnrichmentFailure,
  EnrichmentResult,
} from './value-extraction/enriched-component'

vi.mock('./connection-detection/resolve-http-links', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./connection-detection/resolve-http-links')>()),
  stripResolvedCustomTypes: vi.fn((components: unknown[]) => components),
}))

const notUsedRule: ComponentRuleInput = { notUsed: true }

function createModule(name: string, modules?: string): ValidatedModuleInput {
  return {
    api: notUsedRule,
    domain: name,
    domainOp: notUsedRule,
    event: notUsedRule,
    eventHandler: notUsedRule,
    glob: 'src/**',
    name,
    ...(modules === undefined ? {} : { modules }),
    path: name,
    ui: notUsedRule,
    useCase: notUsedRule,
  }
}

function createModuleContext(moduleName: string) {
  return {
    files: [],
    moduleName,
    project: new Project(),
  }
}

function createDraft(
  domain: string,
  name: string,
  module = domain,
  file = 'test.ts',
): DraftComponent {
  return DraftComponent.parseOrThrow({
    domain,
    location: {
      file,
      line: 1,
    },
    name,
    module,
    type: 'api',
  })
}

const moduleEnrichment: {
  spy: MockInstance<RiviereModule['enrichDraftComponents']> | undefined
} = {
  spy: undefined,
}

function enrichmentSpy() {
  const spy = moduleEnrichment.spy
  if (spy === undefined) throw new TestFixtureError('Expected module enrichment spy')
  return spy
}

function calledModule(callIndex: number): RiviereModule {
  const value: unknown = enrichmentSpy().mock.contexts[callIndex]
  if (!(value instanceof RiviereModule)) throw new TestFixtureError('Expected RiviereModule')
  return value
}

function enrichedComponent(domain: string, name: string): EnrichedComponent {
  return EnrichedComponent.parse({
    domain,
    name,
    module: domain,
    type: 'api',
    location: { file: 'test.ts', line: 1 },
    metadata: {},
    _missing: undefined,
  })
}

function enrichmentResult(
  components: EnrichedComponent[],
  failures: EnrichmentFailure[] = [],
): EnrichmentResult {
  return EnrichmentResult.parse({ components, failures })
}

function enrichmentFailure(field: string): EnrichmentFailure {
  return EnrichmentFailure.parse({
    component: createDraft('orders', 'FailedComponent'),
    field,
    error: `Could not extract ${field}`,
  })
}

function createRiviereProject(
  moduleContexts: Array<{
    files: string[]
    moduleName: string
    modules?: string
    project: Project
  }>,
  draftComponents: readonly DraftComponent[],
): RiviereProject {
  const configurationResult = ValidatedConfiguration.parse({
    modules: moduleContexts.map((context) => createModule(context.moduleName, context.modules)),
  })
  assert(configurationResult.success)
  const stageContexts: Array<{
    files: string[]
    module: ValidatedModule
    project: Project
  }> = []
  configurationResult.data.modules.forEach((module, index) => {
    const context = moduleContexts[index]
    assert(context)
    stageContexts.push({ module, files: context.files, project: context.project })
  })
  const configuration = ExtractionConfiguration.parse({
    name: 'test',
    configPath: 'config.yml',
    useTsConfig: false,
    repositoryName: 'test-repo',
    resolvedConfig: configurationResult.data,
    moduleContexts: stageContexts,
  })
  const projectResult = RiviereProject.parse({ configuration, draftComponents })
  assert(projectResult.success)
  return projectResult.data
}

function enrichDraftComponents(
  moduleContexts: Parameters<typeof createRiviereProject>[0],
  draftComponents: readonly DraftComponent[],
  options: { allowIncomplete: boolean; includeConnections: boolean },
) {
  return createRiviereProject(moduleContexts, draftComponents).enrichDraftComponents(options)
}

describe('RiviereProject.enrichDraftComponents', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    moduleEnrichment.spy = vi.spyOn(RiviereModule.prototype, 'enrichDraftComponents')
  })

  it('enriches drafts grouped by module', () => {
    enrichmentSpy()
      .mockReturnValueOnce(enrichmentResult([enrichedComponent('orders', 'CompA')]))
      .mockReturnValueOnce(enrichmentResult([enrichedComponent('shipping', 'CompB')]))

    const result = enrichDraftComponents(
      [createModuleContext('orders'), createModuleContext('shipping')],
      [
        createDraft('orders', 'CompA'),
        createDraft('orders', 'CompA2'),
        createDraft('shipping', 'CompB'),
      ],
      {
        allowIncomplete: false,
        includeConnections: true,
      },
    )

    assert(result.kind === 'full')
    expect(result.components).toHaveLength(2)
    expect(enrichmentSpy()).toHaveBeenCalledTimes(2)
  })

  it('routes correct drafts to each module', () => {
    enrichmentSpy().mockReturnValue(enrichmentResult([]))

    enrichDraftComponents(
      [createModuleContext('orders'), createModuleContext('shipping')],
      [createDraft('orders', 'CompA'), createDraft('shipping', 'CompB')],
      {
        allowIncomplete: false,
        includeConnections: true,
      },
    )

    expect([
      {
        drafts: calledModule(0).draftComponents(),
        moduleName: calledModule(0).name(),
      },
      {
        drafts: calledModule(1).draftComponents(),
        moduleName: calledModule(1).name(),
      },
    ]).toStrictEqual([
      { drafts: [createDraft('orders', 'CompA')], moduleName: 'orders' },
      { drafts: [createDraft('shipping', 'CompB')], moduleName: 'shipping' },
    ])
  })

  it('deduplicates failed fields across modules', () => {
    enrichmentSpy()
      .mockReturnValueOnce(enrichmentResult([], [enrichmentFailure('name')]))
      .mockReturnValueOnce(
        enrichmentResult([], [enrichmentFailure('name'), enrichmentFailure('type')]),
      )

    const result = enrichDraftComponents(
      [createModuleContext('orders'), createModuleContext('shipping')],
      [createDraft('orders', 'A'), createDraft('shipping', 'B')],
      {
        allowIncomplete: true,
        includeConnections: true,
      },
    )

    assert(result.kind === 'full')
    expect(result.components).toHaveLength(0)
    expect(result.failedFields).toStrictEqual(['name', 'type'])
  })

  it('skips modules with no matching drafts', () => {
    enrichmentSpy().mockReturnValue(enrichmentResult([]))

    const result = enrichDraftComponents(
      [createModuleContext('orders'), createModuleContext('empty')],
      [createDraft('orders', 'A')],
      {
        allowIncomplete: false,
        includeConnections: true,
      },
    )

    expect(enrichmentSpy()).toHaveBeenCalledTimes(1)
    assert(result.kind === 'full')
    expect(result.components).toStrictEqual([])
  })

  it('throws OrphanedDraftComponentError when drafts reference unknown modules', () => {
    expect(() =>
      enrichDraftComponents(
        [createModuleContext('orders')],
        [createDraft('orders', 'A'), createDraft('unknown-module', 'B')],
        {
          allowIncomplete: false,
          includeConnections: true,
        },
      ),
    ).toThrow(OrphanedDraftComponentError)
  })

  it('includes unexpected domains in orphan error message', () => {
    expect(() =>
      enrichDraftComponents([createModuleContext('orders')], [createDraft('ghost', 'X')], {
        allowIncomplete: false,
        includeConnections: true,
      }),
    ).toThrow(
      'Draft components reference unexpected domains: [ghost]. Configured domains: [orders]',
    )
  })

  it('groups configured submodule drafts under their parent module', () => {
    enrichmentSpy().mockReturnValue(enrichmentResult([]))

    enrichDraftComponents(
      [
        {
          files: ['src/checkout/test.ts'],
          moduleName: 'orders',
          modules: 'src/{module}/',
          project: new Project(),
        },
      ],
      [createDraft('orders', 'CompA', 'checkout', 'src/checkout/test.ts')],
      {
        allowIncomplete: false,
        includeConnections: true,
      },
    )

    expect(calledModule(0).draftComponents()).toStrictEqual([
      createDraft('orders', 'CompA', 'checkout', 'src/checkout/test.ts'),
    ])
    expect(calledModule(0).name()).toBe('orders')
  })

  it('returns empty result when no drafts provided', () => {
    const result = enrichDraftComponents([createModuleContext('orders')], [], {
      allowIncomplete: false,
      includeConnections: true,
    })

    assert(result.kind === 'full')
    expect(result.components).toStrictEqual([])
    expect(enrichmentSpy()).not.toHaveBeenCalled()
  })

  it('returns field failure when enrichment fails and incomplete is disabled', () => {
    enrichmentSpy().mockReturnValue(enrichmentResult([], [enrichmentFailure('name')]))

    const result = enrichDraftComponents(
      [createModuleContext('orders')],
      [createDraft('orders', 'A')],
      {
        allowIncomplete: false,
        includeConnections: true,
      },
    )

    expect(result).toStrictEqual({
      kind: 'fieldFailure',
      failedFields: ['name'],
    })
  })

  it('returns draftOnly when includeConnections is false', () => {
    const result = enrichDraftComponents(
      [createModuleContext('orders')],
      [createDraft('orders', 'CompA')],
      {
        allowIncomplete: false,
        includeConnections: false,
      },
    )

    assert(result.kind === 'draftOnly')
    expect(result.components).toHaveLength(1)
  })
})
