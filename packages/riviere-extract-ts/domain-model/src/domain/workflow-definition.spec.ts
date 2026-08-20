import { describe, expect, it } from 'vitest'
import { WorkflowDefinition } from './workflow-definition'

class WorkflowDefinitionTestError extends Error {}

function validWorkflow(): Record<string, unknown> {
  return {
    version: 1,
    graph: {
      sources: [{ repository: 'https://github.com/test/orders' }],
      domains: [{ name: 'orders' }],
      outputPath: '.riviere/graph.json',
    },
    runLog: { directory: '.riviere/logs' },
    stages: [
      { extract: { name: 'extract-orders', config: '.riviere/extract.yml' } },
      { link: { config: '.riviere/link.yml' } },
      { validate: {} },
    ],
  }
}

function parseError(input: unknown): string {
  const result = WorkflowDefinition.parse(input)
  if (result.success) throw new WorkflowDefinitionTestError('Expected workflow definition to fail')
  return result.error
}

describe('WorkflowDefinition', () => {
  it('parses a workflow and supplies domain defaults', () => {
    const result = WorkflowDefinition.parse(validWorkflow())

    expect(result).toMatchObject({
      success: true,
      data: {
        graph: {
          domains: { orders: { description: 'orders', systemType: 'domain' } },
          outputPath: '.riviere/graph.json',
          sources: [{ repository: 'https://github.com/test/orders' }],
        },
        runLogDirectory: '.riviere/logs',
        stages: [
          { kind: 'extract', name: 'extract-orders', configPath: '.riviere/extract.yml' },
          { kind: 'link', configPath: '.riviere/link.yml' },
          { kind: 'validate' },
        ],
      },
    })
  })

  it.each([
    ['workflow must be an object', undefined],
    ['version must be 1', { ...validWorkflow(), version: 2 }],
    ['graph is required', { ...validWorkflow(), graph: [] }],
    ['sources is required', { ...validWorkflow(), graph: { domains: [{ name: 'orders' }], outputPath: 'graph.json' } }],
    ['graph.sources must not be empty', { ...validWorkflow(), graph: { sources: [], domains: [{ name: 'orders' }], outputPath: 'graph.json' } }],
    ['graph.sources[0] must be an object', { ...validWorkflow(), graph: { sources: [null], domains: [{ name: 'orders' }], outputPath: 'graph.json' } }],
    ['repository is required', { ...validWorkflow(), graph: { sources: [{ repository: 2 }], domains: [{ name: 'orders' }], outputPath: 'graph.json' } }],
    ['domains is required', { ...validWorkflow(), graph: { sources: [{ repository: 'repo' }], outputPath: 'graph.json' } }],
    ['graph.domains must not be empty', { ...validWorkflow(), graph: { sources: [{ repository: 'repo' }], domains: [], outputPath: 'graph.json' } }],
    ['graph.domains[0] must be an object', { ...validWorkflow(), graph: { sources: [{ repository: 'repo' }], domains: [null], outputPath: 'graph.json' } }],
    ['name is required', { ...validWorkflow(), graph: { sources: [{ repository: 'repo' }], domains: [{}], outputPath: 'graph.json' } }],
    ['description must be a string', { ...validWorkflow(), graph: { sources: [{ repository: 'repo' }], domains: [{ name: 'orders', description: 1 }], outputPath: 'graph.json' } }],
    ['systemType is invalid', { ...validWorkflow(), graph: { sources: [{ repository: 'repo' }], domains: [{ name: 'orders', systemType: 1 }], outputPath: 'graph.json' } }],
    ['systemType is invalid', { ...validWorkflow(), graph: { sources: [{ repository: 'repo' }], domains: [{ name: 'orders', systemType: 'invalid' }], outputPath: 'graph.json' } }],
    ['outputPath is required', { ...validWorkflow(), graph: { sources: [{ repository: 'repo' }], domains: [{ name: 'orders' }] } }],
    ['runLog is required', { ...validWorkflow(), runLog: null }],
    ['directory is required', { ...validWorkflow(), runLog: { directory: '' } }],
    ['stages is required', { ...validWorkflow(), stages: {} }],
    ['stages[0] must be an object', { ...validWorkflow(), stages: [null] }],
    ['stages[0] must contain one stage type', { ...validWorkflow(), stages: [{ extract: {}, link: {} }] }],
    ['stages[0].extract must be an object', { ...validWorkflow(), stages: [{ extract: null }] }],
    ['name is required', { ...validWorkflow(), stages: [{ extract: { config: 'extract.yml' } }] }],
    ['config is required', { ...validWorkflow(), stages: [{ extract: { name: 'extract-orders' } }] }],
    ['config is required', { ...validWorkflow(), stages: [{ extract: { name: 'extract-orders', config: 'extract.yml' } }, { link: {} }, { validate: {} }] }],
    ["Unknown workflow stage type 'publish'", { ...validWorkflow(), stages: [{ extract: { name: 'extract-orders', config: 'extract.yml' } }, { publish: {} }, { validate: {} }] }],
    ['Extract stage names must be unique', { ...validWorkflow(), stages: [{ extract: { name: 'extract-orders', config: 'extract.yml' } }, { extract: { name: 'extract-orders', config: 'another.yml' } }, { link: { config: 'link.yml' } }, { validate: {} }] }],
    ['Workflow must contain an extract stage', { ...validWorkflow(), stages: [{ link: { config: 'link.yml' } }, { validate: {} }] }],
    ['Workflow must contain exactly one link stage', { ...validWorkflow(), stages: [{ extract: { name: 'extract-orders', config: 'extract.yml' } }, { validate: {} }] }],
    ['Workflow must contain exactly one validate stage', { ...validWorkflow(), stages: [{ extract: { name: 'extract-orders', config: 'extract.yml' } }, { link: { config: 'link.yml' } }] }],
    ['Workflow stages must be ordered as extract, link, validate', { ...validWorkflow(), stages: [{ link: { config: 'link.yml' } }, { extract: { name: 'extract-orders', config: 'extract.yml' } }, { validate: {} }] }],
  ])('rejects invalid input: %s', (expected, input) => {
    expect(parseError(input)).toBe(expected)
  })

  it.each(['domain', 'bff', 'ui', 'external-service', 'other'])(
    'accepts %s as a domain system type',
    (systemType) => {
      const result = WorkflowDefinition.parse({
        ...validWorkflow(),
        graph: {
          sources: [{ repository: 'repo' }],
          domains: [{ name: 'orders', description: 'Orders', systemType }],
          outputPath: 'graph.json',
        },
      })

      expect(result).toMatchObject({
        success: true,
        data: { graph: { domains: { orders: { description: 'Orders', systemType } } } },
      })
    },
  )
})
