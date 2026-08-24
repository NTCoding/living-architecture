import { assert, describe, expect, it } from 'vitest'
import { Project } from 'ts-morph'
import { ValidatedConfiguration } from '@living-architecture/riviere-extract-config-published-language'
import { ExtractionStage } from './extraction-stage'
import { ModuleContextsMismatchError } from './extraction-errors'

type ModuleContext = {
  module: ValidatedConfiguration['modules'][number]
  files: string[]
  project: Project
}

function invalidContextsFor(
  createInvalidContexts: (
    context: ModuleContext,
    foreignModule: ModuleContext['module'],
  ) => ModuleContext[],
  context: ModuleContext,
  foreignModule: ModuleContext['module'],
): ModuleContext[] {
  return createInvalidContexts(context, foreignModule)
}

function createConfiguration() {
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
  return result.data
}

describe('ExtractionStage', () => {
  it('stores the resolved extraction state for one stage', () => {
    const resolvedConfig = createConfiguration()
    const module = resolvedConfig.modules[0]
    assert(module)
    const project = new Project()
    const moduleContexts = [{ module, files: ['orders/order.ts'], project }]

    const stage = ExtractionStage.parse({
      name: 'orders',
      configPath: 'config/orders.json',
      useTsConfig: true,
      repositoryName: 'shop',
      resolvedConfig,
      moduleContexts,
    })

    expect(stage).toMatchObject({
      name: 'orders',
      configPath: 'config/orders.json',
      useTsConfig: true,
      repositoryName: 'shop',
      resolvedConfig,
      moduleContexts,
    })
  })

  it.each([
    ['a missing module context', () => []],
    ['duplicate contexts', (context: ModuleContext) => [context, context]],
    [
      'a context for a module absent from the configuration',
      (_context: ModuleContext, foreignModule: ModuleContext['module']) => [
        { module: foreignModule, files: [], project: new Project() },
      ],
    ],
  ])('rejects %s', (_description, createInvalidContexts) => {
    const resolvedConfig = createConfiguration()
    const module = resolvedConfig.modules[0]
    assert(module)
    const context = { module, files: ['orders/order.ts'], project: new Project() }
    const foreignResult = ValidatedConfiguration.parse({
      modules: [
        {
          name: 'billing',
          domain: 'billing',
          path: 'billing',
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
    assert(foreignResult.success)
    const foreignModule = foreignResult.data.modules[0]
    assert(foreignModule)
    const invalidContexts = invalidContextsFor(createInvalidContexts, context, foreignModule)

    expect(() =>
      ExtractionStage.parse({
        name: 'orders',
        configPath: 'config/orders.json',
        useTsConfig: true,
        repositoryName: 'shop',
        resolvedConfig,
        moduleContexts: invalidContexts,
      }),
    ).toThrowError(new ModuleContextsMismatchError())
  })
})
