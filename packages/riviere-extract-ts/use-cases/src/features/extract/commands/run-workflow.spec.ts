import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createGraphBuilder: vi.fn(),
  load: vi.fn(),
  rebuildGraph: vi.fn(),
}))

vi.mock('../data-access/riviere-project/riviere-project-repository', () => ({
  RiviereProjectRepository: class {
    load = mocks.load
  },
}))

import { ExtractionConfigError } from '../data-access/riviere-project/riviere-config-error'
import { ExtractionDataAccessError } from '../data-access/riviere-project/riviere-project-error'
import { RiviereProjectRepository } from '../data-access/riviere-project/riviere-project-repository'
import { RunWorkflow } from './run-workflow'

const graph = {
  version: '1.0',
  metadata: { domains: {}, sources: [] },
  components: [],
  links: [],
  externalLinks: [],
}
const workflow = {
  graph: { domains: {}, outputPath: '/work/graph.json', sources: [{ repository: 'shop' }] },
  runLogDirectory: '/work/logs',
}
const graphBuilder = { addComponents: vi.fn(), addLinks: vi.fn(), validate: vi.fn(), build: vi.fn() }

class UnexpectedBuilderError extends Error {}

function execute(): ReturnType<RunWorkflow['execute']> {
  return new RunWorkflow(new RiviereProjectRepository(), mocks.createGraphBuilder).execute({
    projectRoot: '/work',
    workflowName: 'main',
  })
}

describe('RunWorkflow', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.createGraphBuilder.mockReturnValue(graphBuilder)
    mocks.load.mockReturnValue({ workflowState: workflow, rebuildGraph: mocks.rebuildGraph })
    mocks.rebuildGraph.mockReturnValue({ ok: true, graph })
  })

  it('loads the workflow, builds a fresh graph builder, and returns graph destinations', () => {
    const result = execute()

    expect(result).toStrictEqual({
      result: {
        kind: 'success',
        graph,
        outputPath: '/work/graph.json',
        runLogDirectory: '/work/logs',
      },
    })
    expect({ load: mocks.load.mock.calls, rebuild: mocks.rebuildGraph.mock.calls }).toStrictEqual({
      load: [[{ projectRoot: '/work', workflowName: 'main' }]],
      rebuild: [[graphBuilder]],
    })
  })

  it('returns a typed extraction failure from the aggregate', () => {
    mocks.rebuildGraph.mockReturnValue({
      ok: false,
      failure: { reason: 'Could not enrich fields', failedFields: ['path'] },
    })

    expect(execute()).toStrictEqual({
      result: {
        kind: 'extractionFailure',
        reason: 'Could not enrich fields',
        failedFields: ['path'],
      },
    })
  })

  it('returns configuration failures from loading and missing workflow state', () => {
    mocks.load.mockImplementationOnce(() => {
      throw new ExtractionConfigError('CONFIG_NOT_FOUND', 'Workflow was not found')
    })

    expect(execute()).toStrictEqual({
      result: { kind: 'configFailure', code: 'CONFIG_NOT_FOUND', message: 'Workflow was not found' },
    })

    mocks.load.mockReturnValue({ workflowState: undefined })
    expect(execute()).toStrictEqual({
      result: {
        kind: 'configFailure',
        code: 'VALIDATION_ERROR',
        message: 'Loaded workflow is missing workflow state',
      },
    })
  })

  it('returns data access failures from loading', () => {
    mocks.load.mockImplementation(() => {
      throw new ExtractionDataAccessError('FILE_READ_ERROR', 'Could not read workflow')
    })

    expect(execute()).toStrictEqual({
      result: { kind: 'dataAccessFailure', code: 'FILE_READ_ERROR', message: 'Could not read workflow' },
    })
  })

  it('lets an unexpected builder error bubble out', () => {
    mocks.createGraphBuilder.mockImplementation(() => {
      throw new UnexpectedBuilderError('Graph builder failed')
    })

    expect(execute).toThrow(new UnexpectedBuilderError('Graph builder failed'))
  })
})
