import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { RiviereProject } from '@living-architecture/riviere-extract-ts-domain-model/domain/riviere-project'
import {
  cleanupWorkflowWorkspaces,
  createWorkflowWorkspace as workspace,
} from '../../../../__fixtures__/riviere-project-workspace-fixtures'
import {
  loadWorkflow,
  writeCodeExtractionConfig,
  writeImportStage,
  writeWorkflow,
} from '../../../../__fixtures__/riviere-project-workflow-fixtures'

afterEach(cleanupWorkflowWorkspaces)

describe('RiviereProjectRepository workflow stage materialization', () => {
  it('materializes an asyncapi-import stage with validated mappings', () => {
    const directory = workspace()
    writeImportStage(directory, 'asyncapi-import', [
      'messages:',
      '  OrderPlacedMessage:',
      '    domain: orders',
      '    module: infrastructure',
      '    name: OrderPlaced',
      'operations:',
      '  processOrder:',
      '    type: UseCase',
      '    domain: orders',
      '    module: checkout',
      '    name: ProcessOrder',
    ])

    expect(loadWorkflow(directory, 'combined').build().metadata.name).toBe('combined-graph')
  })

  it('rejects asyncapi-import mappings with unknown keys', () => {
    const directory = workspace()
    writeImportStage(directory, 'asyncapi-import', [
      'messages: {}',
      'operations: {}',
      'unexpected: true',
    ])

    expect(() => loadWorkflow(directory, 'combined')).toThrow(/Invalid AsyncAPI mappings/)
  })

  it('materializes an eventcatalog-import stage with validated mappings', () => {
    const directory = workspace()
    writeImportStage(directory, 'eventcatalog-import', [
      'domains:',
      '  OrdersDomain: orders',
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

    const project = loadWorkflow(directory, 'combined')

    expect(project.build().metadata.name).toBe('combined-graph')
  })

  it('rejects eventcatalog-import mappings with unknown keys', () => {
    const directory = workspace()
    writeImportStage(directory, 'eventcatalog-import', [
      'domains: {}',
      'services: {}',
      'events: {}',
      'unexpected: true',
    ])

    expect(() => loadWorkflow(directory, 'combined')).toThrow(/Invalid EventCatalog mappings/)
  })

  it('materializes an ai-extract stage', () => {
    const directory = workspace()
    writeFileSync(
      join(directory, '.riviere', 'workflows', 'ai.yaml'),
      [
        'command: extract',
        'args: [extract]',
        'timeout-seconds: 10',
        'sources: [src]',
        'selection:',
        '  from: [uncertain-links]',
        '  component-types: [UseCase]',
        'outputs:',
        '  add-components: true',
        '  add-links: true',
        'context:',
        '  exclude: []',
        '  max-files-per-batch: 5',
        '  max-batches: 2',
      ].join('\n'),
    )
    writeWorkflow(directory, '  - kind: ai-extract\n    name: extract\n    config: ai.yaml')

    expect(loadWorkflow(directory, 'combined')).toBeInstanceOf(RiviereProject)
  })

  it('materializes an ai-enrich stage', () => {
    const directory = workspace()
    writeFileSync(
      join(directory, '.riviere', 'workflows', 'ai.yaml'),
      [
        'command: enrich',
        'args: [enrich]',
        'timeout-seconds: 10',
        'sources: [src]',
        'memory: memory.md',
        'prompt-append: prompt.md',
        'selection:',
        '  component-types: [UseCase]',
        '  missing-fields-only: true',
        'fields: [operationName]',
        'context:',
        '  exclude: []',
        '  max-files-per-component: 5',
      ].join('\n'),
    )
    writeWorkflow(directory, '  - kind: ai-enrich\n    name: enrich\n    config: ai.yaml')

    expect(loadWorkflow(directory, 'combined')).toBeInstanceOf(RiviereProject)
  })

  it.each([
    ['eventcatalog missing mappings', 'eventcatalog-import', 'source: a.json\n', /mappings/],
    [
      'eventcatalog unknown key',
      'eventcatalog-import',
      'source: a.json\nmappings: m.yaml\nallow-unmapped: false\nunexpected: true\n',
      /unexpected/,
    ],
    [
      'eventcatalog empty source',
      'eventcatalog-import',
      "source: ''\nmappings: m.yaml\nallow-unmapped: false\n",
      /source: Too small/,
    ],
    ['asyncapi missing mappings', 'asyncapi-import', 'source: a.json\n', /mappings/],
    ['incomplete ai-extract config', 'ai-extract', 'command: extract\n', /timeout-seconds/],
    ['incomplete ai-enrich config', 'ai-enrich', 'command: enrich\n', /timeout-seconds/],
  ])('rejects an invalid %s config', (_scenario, kind, configYaml, error) => {
    const directory = workspace()
    writeFileSync(join(directory, '.riviere', 'workflows', 'stage.yaml'), configYaml)
    writeFileSync(
      join(directory, '.riviere', 'workflows', 'm.yaml'),
      'domains: {}\nservices: {}\nevents: {}\n',
    )
    writeWorkflow(directory, `  - kind: ${kind}\n    name: stage\n    config: stage.yaml`)

    expect(() => loadWorkflow(directory, 'combined')).toThrow(error)
  })

  it('materializes a code-extraction stage', () => {
    const directory = workspace()
    writeCodeExtractionConfig(directory)
    writeFileSync(
      join(directory, '.riviere', 'workflows', 'orders.ts'),
      'export const orders = 1\n',
    )
    writeWorkflow(
      directory,
      '  - kind: code-extraction\n    name: extract\n    config: extract.yaml',
    )

    expect(loadWorkflow(directory, 'combined')).toBeInstanceOf(RiviereProject)
  })

  it('rejects a code-extraction stage whose configuration matches no source files', () => {
    const directory = workspace()
    writeCodeExtractionConfig(directory)
    writeWorkflow(
      directory,
      '  - kind: code-extraction\n    name: extract\n    config: extract.yaml',
    )

    expect(() => loadWorkflow(directory, 'combined')).toThrow(
      'No files matched extraction patterns',
    )
  })

  it('rejects a workflow whose name is invalid for the workflow runner', () => {
    const directory = workspace()
    writeFileSync(
      join(directory, '.riviere', 'workflows', 'combined.yaml'),
      [
        'apiVersion: v1',
        'name: Has Spaces',
        'output: .riviere/graph.json',
        'sources:',
        '  - repository: workflow-test',
        'domains:',
        '  orders:',
        '    description: orders domain',
        'stages:',
        '  - kind: schema-validate',
        '    name: validate',
      ].join('\n'),
    )

    expect(() => loadWorkflow(directory, 'combined')).toThrow(
      /Workflow name 'Has Spaces' must match/,
    )
  })
})
