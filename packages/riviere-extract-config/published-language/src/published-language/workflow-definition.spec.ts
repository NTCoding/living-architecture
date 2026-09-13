import { assert, describe, expect, it } from 'vitest'
import { parseWorkflowDefinition } from './workflow-definition'

const validWorkflow = {
  apiVersion: 'v1',
  name: 'Combined graph',
  description: 'Orders and shipping',
  output: '.riviere/graph.json',
  sources: [{ name: 'example', repository: 'github.com/example/orders' }],
  domains: {
    orders: { description: 'Order domain', systemType: 'bff' },
    shipping: { description: 'Shipping domain' },
  },
  stages: [
    { kind: 'code-extraction', name: 'extract', config: 'orders.yaml' },
    { kind: 'schema-validate', name: 'validate' },
  ],
}

describe('parseWorkflowDefinition', () => {
  it('parses the complete V1 workflow language', () => {
    expect(parseWorkflowDefinition(validWorkflow)).toStrictEqual({
      success: true,
      definition: {
        apiVersion: 'v1',
        name: 'Combined graph',
        description: 'Orders and shipping',
        output: '.riviere/graph.json',
        sources: [{ name: 'example', repository: 'github.com/example/orders' }],
        domains: {
          orders: { description: 'Order domain', systemType: 'bff' },
          shipping: { description: 'Shipping domain', systemType: 'domain' },
        },
        stages: [
          { kind: 'code-extraction', name: 'extract', config: 'orders.yaml' },
          { kind: 'schema-validate', name: 'validate' },
        ],
      },
    })
  })

  it('applies defaults and omits absent optional values', () => {
    const result = parseWorkflowDefinition({
      apiVersion: 'v1',
      name: 'Minimal graph',
      output: '.riviere/graph.json',
      sources: validWorkflow.sources,
      domains: { orders: { description: 'Order domain' } },
      stages: [{ kind: 'ai-extract', name: 'enrich', config: 'ai.yaml' }],
    })

    expect(result).toMatchObject({
      success: true,
      definition: {
        domains: { orders: { description: 'Order domain', systemType: 'domain' } },
        stages: [{ kind: 'ai-extract', name: 'enrich', config: 'ai.yaml' }],
      },
    })
    assert(result.success)
    expect(result.definition).not.toHaveProperty('description')
  })

  it('accepts all configured stage kinds and reports them as definitions', () => {
    for (const kind of ['eventcatalog-import', 'asyncapi-import', 'ai-enrich'] as const) {
      const result = parseWorkflowDefinition({
        ...validWorkflow,
        stages: [{ kind, name: 'stage', config: 'stage.yaml' }],
      })
      assert(result.success)
      expect(result.definition.stages).toStrictEqual([
        { kind, name: 'stage', config: 'stage.yaml' },
      ])
    }
  })

  it('reports errors at the document root', () => {
    expect(parseWorkflowDefinition(null)).toMatchObject({
      success: false,
      issues: [expect.stringMatching(/^\/:/)],
    })
  })

  it.each([
    ['unsupported api version', { ...validWorkflow, apiVersion: 'v2' }],
    ['missing api version', { ...validWorkflow, apiVersion: undefined }],
    ['missing name', { ...validWorkflow, name: undefined }],
    ['empty name', { ...validWorkflow, name: '' }],
    ['missing output', { ...validWorkflow, output: undefined }],
    ['empty output', { ...validWorkflow, output: '' }],
    ['missing sources', { ...validWorkflow, sources: undefined }],
    ['empty sources', { ...validWorkflow, sources: [] }],
    ['missing domains', { ...validWorkflow, domains: undefined }],
    ['empty domains', { ...validWorkflow, domains: {} }],
    ['empty domain name', { ...validWorkflow, domains: { '': { description: 'Order domain' } } }],
    [
      'unsupported domain system type',
      {
        ...validWorkflow,
        domains: { orders: { description: 'Order domain', systemType: 'invalid' } },
      },
    ],
    ['domain missing description', { ...validWorkflow, domains: { orders: {} } }],
    ['missing stages', { ...validWorkflow, stages: undefined }],
    ['empty stages', { ...validWorkflow, stages: [] }],
    [
      'duplicate stage names',
      {
        ...validWorkflow,
        stages: [
          { kind: 'code-extraction', name: 'dupe', config: 'one.yaml' },
          { kind: 'ai-extract', name: 'dupe', config: 'two.yaml' },
        ],
      },
    ],
    ['unknown stage kind', { ...validWorkflow, stages: [{ kind: 'command', name: 'stage' }] }],
    [
      'configured stage missing config',
      { ...validWorkflow, stages: [{ kind: 'code-extraction', name: 'stage' }] },
    ],
    [
      'configured stage with blank name',
      { ...validWorkflow, stages: [{ kind: 'code-extraction', name: '', config: 'orders.yaml' }] },
    ],
    [
      'schema-validate stage with config',
      {
        ...validWorkflow,
        stages: [{ kind: 'schema-validate', name: 'stage', config: 'x.yaml' }],
      },
    ],
    [
      'schema-validate stage with blank name',
      { ...validWorkflow, stages: [{ kind: 'schema-validate', name: '' }] },
    ],
  ])('rejects %s', (_case, input) => {
    expect(parseWorkflowDefinition(input)).toMatchObject({ success: false })
  })
})
