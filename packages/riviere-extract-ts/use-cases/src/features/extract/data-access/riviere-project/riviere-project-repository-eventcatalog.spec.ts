import {
  cleanupWorkflowWorkspaces,
  createWorkflowWorkspace as workspace,
} from '../../../../__fixtures__/riviere-project-workspace-fixtures'
import { join } from 'node:path'
import { afterEach, assert, describe, expect, it } from 'vitest'
import { RiviereProjectRepository } from './riviere-project-repository'
import { configureExtraction } from '../../commands/configure-extraction'
import { aiCli } from '../../../../__fixtures__/riviere-project-repository-fixtures'
import { writeImportStage } from '../../../../__fixtures__/riviere-project-workflow-fixtures'

afterEach(cleanupWorkflowWorkspaces)

describe('RiviereProjectRepository EventCatalog workflow', () => {
  it('runs an EventCatalog import stage through the supplied port', async () => {
    const directory = workspace()
    writeImportStage(directory, 'eventcatalog-import', [
      'domains: {}',
      'services:',
      '  OrdersService:',
      '    type: UseCase',
      '    domain: orders',
      '    module: checkout',
      '    name: PlaceOrder',
      'events:',
      '  OrderCreated:',
      '    name: OrderPlaced',
    ])
    const extractionConfiguration = configureExtraction({})
    const repository = new RiviereProjectRepository({
      aiCli: aiCli(),
      loadEventCatalogSource: () =>
        Promise.resolve({
          domains: [],
          services: [
            { id: 'OrdersService', name: 'Orders', produces: ['OrderCreated'], consumes: [] },
          ],
          events: [{ id: 'OrderCreated', name: 'Order Created' }],
        }),
      loadAsyncApiDocument: () => Promise.resolve({ messages: [], operations: [] }),
      loadCodeExtraction: () => [],
      extractionBehaviour: extractionConfiguration.extractionBehaviour(),
      moduleExtractionRules: extractionConfiguration.moduleExtractionRules(),
    })

    const project = repository.load({
      kind: 'workflow',
      workflowPath: join(directory, '.riviere', 'workflows', 'combined.yaml'),
    })
    const run = await project.rebuildGraph()

    assert(run.success)
    expect(run.graph.components.map((component) => component.id)).toStrictEqual([
      'orders:checkout:usecase:placeorder',
      'orders:checkout:event:orderplaced',
    ])
  })
})
