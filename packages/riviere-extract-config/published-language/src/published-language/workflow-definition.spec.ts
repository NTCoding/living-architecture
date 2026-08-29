import { assert, describe, expect, it } from 'vitest'
import { parseWorkflowDefinition } from './workflow-definition'

const validWorkflow = {
  version: 1,
  graph: {
    name: 'Combined graph',
    description: 'Orders and shipping',
    sources: [{ name: 'example', repository: 'example' }],
    domains: [
      { name: 'orders', description: 'Order domain', systemType: 'bff' },
      { name: 'shipping' },
    ],
    outputPath: '.riviere/graph.json',
  },
  runLog: { directory: '.riviere/logs' },
  stages: [
    { extract: { name: 'orders', config: 'orders.yaml', useTsConfig: false } },
    { link: { config: 'combined.yaml' } },
    { validate: {} },
  ],
}

describe('parseWorkflowDefinition', () => {
  it('parses the complete V1 workflow language', () => {
    expect(parseWorkflowDefinition(validWorkflow)).toStrictEqual({
      success: true,
      definition: {
        version: 1,
        graph: {
          name: 'Combined graph',
          description: 'Orders and shipping',
          sources: [{ repository: 'example' }],
          domains: {
            orders: { description: 'Order domain', systemType: 'bff' },
            shipping: { description: 'shipping domain', systemType: 'domain' },
          },
          outputPath: '.riviere/graph.json',
        },
        runLog: { directory: '.riviere/logs' },
        stages: [
          {
            kind: 'extract',
            name: 'orders',
            configPath: 'orders.yaml',
            useTsConfig: false,
          },
          { kind: 'link', name: 'link', configPath: 'combined.yaml', useTsConfig: true },
          { kind: 'validate', name: 'validate' },
        ],
      },
    })
  })

  it('applies defaults when optional workflow values are absent', () => {
    const result = parseWorkflowDefinition({
      ...validWorkflow,
      graph: {
        sources: validWorkflow.graph.sources,
        domains: [{ name: 'orders' }],
        outputPath: validWorkflow.graph.outputPath,
      },
      stages: [{ extract: { name: 'orders', config: 'orders.yaml' } }],
    })

    expect(result).toMatchObject({
      success: true,
      definition: {
        graph: {
          domains: { orders: { description: 'orders domain', systemType: 'domain' } },
        },
        stages: [{ kind: 'extract', useTsConfig: true }],
      },
    })
    assert(result.success)
    expect(result.definition.graph).not.toHaveProperty('name')
    expect(result.definition.graph).not.toHaveProperty('description')
  })

  it('reports errors at the document root', () => {
    expect(parseWorkflowDefinition(null)).toMatchObject({
      success: false,
      issues: [expect.stringMatching(/^\/:/)],
    })
  })

  it.each([
    ['unsupported version', { ...validWorkflow, version: 2 }],
    ['missing graph metadata', { ...validWorkflow, graph: { outputPath: 'graph.json' } }],
    [
      'missing graph sources',
      { ...validWorkflow, graph: { ...validWorkflow.graph, sources: undefined } },
    ],
    [
      'missing graph domains',
      { ...validWorkflow, graph: { ...validWorkflow.graph, domains: undefined } },
    ],
    [
      'missing graph output path',
      { ...validWorkflow, graph: { ...validWorkflow.graph, outputPath: undefined } },
    ],
    ['missing run log directory', { ...validWorkflow, runLog: {} }],
    ['unknown stage type', { ...validWorkflow, stages: [{ command: { run: 'echo forbidden' } }] }],
    [
      'more than one type in a stage',
      { ...validWorkflow, stages: [{ extract: {}, validate: {} }] },
    ],
    ['missing extract config', { ...validWorkflow, stages: [{ extract: { name: 'orders' } }] }],
    ['missing link config', { ...validWorkflow, stages: [{ link: {} }] }],
    ['empty strings', { ...validWorkflow, graph: { ...validWorkflow.graph, outputPath: '' } }],
    [
      'unsupported system type',
      {
        ...validWorkflow,
        graph: { ...validWorkflow.graph, domains: [{ name: 'orders', systemType: 'invalid' }] },
      },
    ],
  ])('rejects %s', (_case, input) => {
    expect(parseWorkflowDefinition(input)).toMatchObject({ success: false })
  })
})
