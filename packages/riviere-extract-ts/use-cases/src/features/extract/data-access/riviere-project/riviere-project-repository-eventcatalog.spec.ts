import {
  cleanupWorkflowWorkspaces,
  createWorkflowWorkspace as workspace,
} from '../../../../__fixtures__/riviere-project-workspace-fixtures'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, assert, describe, expect, it } from 'vitest'
import { RiviereProjectRepository } from './riviere-project-repository'

function writeWorkflow(directory: string): void {
  writeFileSync(
    join(directory, '.riviere', 'workflows', 'combined.yaml'),
    [
      'apiVersion: v1',
      'name: combined-graph',
      'output: ../graph.json',
      'sources:',
      '  - repository: workflow-test',
      'domains:',
      '  orders:',
      '    description: orders domain',
      'stages:',
      '  - kind: eventcatalog-import',
      '    name: import',
      '    config: import.yaml',
    ].join('\n'),
  )
  writeFileSync(
    join(directory, '.riviere', 'workflows', 'import.yaml'),
    'source: eventcatalog\nmappings: mappings.yaml\nallow-unmapped: false\n',
  )
  writeFileSync(
    join(directory, '.riviere', 'workflows', 'mappings.yaml'),
    [
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
    ].join('\n'),
  )
}

afterEach(cleanupWorkflowWorkspaces)

describe('RiviereProjectRepository EventCatalog workflow', () => {
  it('runs an EventCatalog import stage through the supplied port', async () => {
    const directory = workspace()
    writeWorkflow(directory)
    const repository = new RiviereProjectRepository(() =>
      Promise.resolve({
        domains: [],
        services: [
          { id: 'OrdersService', name: 'Orders', produces: ['OrderCreated'], consumes: [] },
        ],
        events: [{ id: 'OrderCreated', name: 'Order Created' }],
      }),
    )

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
