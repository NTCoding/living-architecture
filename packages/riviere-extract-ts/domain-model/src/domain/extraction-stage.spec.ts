import { assert, describe, expect, it } from 'vitest'
import { Project } from 'ts-morph'
import { ValidatedConfiguration } from '@living-architecture/riviere-extract-config-published-language'
import { ExtractionStage } from './extraction-stage'

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
})
