import { assert, describe, expect, it } from 'vitest'
import { Project } from 'ts-morph'
import { ValidatedConfiguration } from '@living-architecture/riviere-extract-config-published-language'
import { DraftComponent } from './component-extraction/draft-component'
import { enrichComponentsForModules } from './enrich-components-for-modules'
import { ExtractionStage } from './extraction-stage'
import { OrphanedDraftComponentError } from './orphaned-draft-component-error'
import { MissingModuleContextError } from './extraction-errors'

function createStage(): ExtractionStage {
  const result = ValidatedConfiguration.parse({
    modules: [
      {
        name: 'orders',
        domain: 'orders',
        path: 'orders',
        glob: '**/*.ts',
        api: { notUsed: true },
        useCase: { notUsed: true },
        domainOp: { notUsed: true },
        event: { notUsed: true },
        eventHandler: { notUsed: true },
        ui: { notUsed: true },
      },
    ],
  })
  assert(result.success)
  const moduleContexts = result.data.modules.map((module) => ({
    module,
    files: [`${module.name}/order.ts`],
    project: new Project(),
  }))
  return ExtractionStage.parse({
    name: 'test',
    configPath: 'config.json',
    useTsConfig: false,
    repositoryName: 'shop',
    resolvedConfig: result.data,
    moduleContexts,
  })
}

function createDraft(module: string, name: string): DraftComponent {
  return DraftComponent.parseOrThrow({
    domain: module,
    location: { file: `${module}/order.ts`, line: 1 },
    module,
    name,
    type: 'useCase',
  })
}

describe('enrichComponentsForModules', () => {
  it('rejects an unknown drafts-by-module key at the enrichment boundary', () => {
    const stage = createStage()
    const draft = createDraft('orders', 'PlaceOrder')

    expect(() =>
      enrichComponentsForModules(
        stage.resolvedConfig.modules,
        stage.moduleContexts.map(({ module, project }) => ({ module, project })),
        new Map([['unknown', [draft]]]),
        false,
      ),
    ).toThrowError(new OrphanedDraftComponentError(['unknown'], ['orders']))
  })

  it('reports a missing context at the service boundary', () => {
    const stage = createStage()

    expect(() =>
      enrichComponentsForModules(
        stage.resolvedConfig.modules,
        [],
        new Map([['orders', [createDraft('orders', 'PlaceOrder')]]]),
        false,
      ),
    ).toThrowError(new MissingModuleContextError('orders'))
  })
})
