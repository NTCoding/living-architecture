import { assert, describe, expect, it } from 'vitest'
import { RiviereProject } from './riviere-project'
import { GraphWithWorkflowStartInput, WorkflowStartInput } from './riviere-project-start-inputs'
import { WorkflowStage } from './workflow-stage'
import { collaborators, graphDefinition } from './__fixtures__/workflow-fixtures'

describe('RiviereProject schema validation stage', () => {
  it('fails schema validation when an earlier stage left unresolved diagnostics', async () => {
    const started = RiviereProject.start(
      GraphWithWorkflowStartInput.from(
        graphDefinition(),
        WorkflowStartInput.from({
          declaredDomains: ['orders'],
          name: 'build-graph',
          outputPath: '/project/.riviere/graph.json',
          runLogDirectory: '/project/.riviere/logs',
          stages: [
            WorkflowStage.fromEventCatalogImport('import-events', {
              source: '/specs/eventcatalog',
              sourceFilePath: 'specs/eventcatalog',
              mappings: { domains: {}, services: {}, events: {} },
              allowUnmapped: true,
            }),
            WorkflowStage.fromSchemaValidation('validate'),
          ],
        }),
      ),
      collaborators({
        domains: [],
        services: [{ id: 'UnmappedService', name: 'Unmapped', produces: [], consumes: [] }],
        events: [],
      }),
    )

    const result = await started.rebuildGraph()

    expect(result).toMatchObject({
      success: false,
      errorCode: 'UNRESOLVED_WORKFLOW_DIAGNOSTICS',
      reason: "Unresolved workflow diagnostics: unmapped service 'UnmappedService'",
    })
  })

  it('records a validation transition whose state equals the preceding transition', async () => {
    const started = RiviereProject.start(
      GraphWithWorkflowStartInput.from(
        graphDefinition(),
        WorkflowStartInput.from({
          declaredDomains: ['orders'],
          name: 'build-graph',
          outputPath: '/project/.riviere/graph.json',
          runLogDirectory: '/project/.riviere/logs',
          stages: [
            WorkflowStage.fromAsyncApiImport('import-asyncapi', {
              source: '/specs/asyncapi.yaml',
              sourceFilePath: 'specs/asyncapi.yaml',
              mappings: {
                messages: {
                  OrderPlacedMessage: {
                    domain: 'orders',
                    module: 'infrastructure',
                    name: 'OrderPlaced',
                  },
                },
                operations: {},
              },
              allowUnmapped: false,
            }),
            WorkflowStage.fromSchemaValidation('validate'),
          ],
        }),
      ),
      collaborators(
        { domains: [], services: [], events: [] },
        {
          messages: [{ id: 'OrderPlacedMessage', name: 'OrderPlacedMessage' }],
          operations: [],
        },
      ),
    )

    const result = await started.rebuildGraph()

    assert(result.success)
    const [, afterImport, afterValidate] = result.transitions
    assert(afterImport !== undefined)
    assert(afterValidate !== undefined)
    expect(afterValidate.value.state).toStrictEqual(afterImport.value.state)
    expect(result.graph.components.map((component) => component.id)).toStrictEqual([
      'orders:infrastructure:event:orderplaced',
    ])
  })
})
