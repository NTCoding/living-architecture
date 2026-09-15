import { assert, describe, expect, it } from 'vitest'
import { RiviereProject } from './riviere-project'
import { WorkflowStage } from './workflow-stage'
import { MissingModuleSourceError } from './extraction-errors'
import { collaborators, configuration } from './__fixtures__/workflow-fixtures'
import { mustBeDefined } from '../__fixtures__/missing-test-fixture-error'
import { GraphWithWorkflowStartInput, WorkflowStartInput } from './riviere-project-start-inputs'

function graphDefinition() {
  return {
    name: 'Shop',
    description: 'Shop graph',
    sources: [{ repository: 'shop' }],
    domains: { orders: { description: 'Orders', systemType: 'domain' } as const },
  }
}

const sharedConfiguration = configuration()

function codeExtractionConfig() {
  const resolved = sharedConfiguration.resolvedConfig
  return {
    modules: [mustBeDefined(resolved.modules[0], 'module')],
    connections: resolved.connections,
    schema: resolved.schema,
  }
}

function codeExtractionStage(configPath?: string): WorkflowStage {
  return WorkflowStage.fromMaterialized({
    kind: 'code-extraction',
    name: 'extract-code',
    ...(configPath === undefined ? {} : { configPath }),
    config: codeExtractionConfig(),
  })
}

function loadCodeExtraction() {
  return sharedConfiguration.moduleContexts
}

function projectWithStage(stage: WorkflowStage, loader = loadCodeExtraction): RiviereProject {
  const started = RiviereProject.start(
    GraphWithWorkflowStartInput.from(
      graphDefinition(),
      WorkflowStartInput.from({
        name: 'build-graph',
        outputPath: '/project/.riviere/graph.json',
        runLogDirectory: '/project/.riviere/logs',
        stages: [stage],
      }),
    ),
    { ...collaborators(), loadCodeExtraction: loader },
  )
  return started
}

describe('RiviereProject code-extraction stage', () => {
  it('runs a code-extraction stage when a config path is present', async () => {
    const result = await projectWithStage(codeExtractionStage('extraction.yml')).rebuildGraph()

    assert(result.success)
    expect(result.graph.components).toHaveLength(0)
  })

  it('fails a code-extraction stage when the config path is absent', async () => {
    const result = await projectWithStage(codeExtractionStage()).rebuildGraph()

    assert(!result.success)
    expect(result.errorCode).toBe('CODE_EXTRACTION_CONFIG_UNAVAILABLE')
  })

  it('fails a code-extraction stage when loading throws', async () => {
    const result = await projectWithStage(codeExtractionStage('extraction.yml'), () => {
      throw new MissingModuleSourceError('orders')
    }).rebuildGraph()

    assert(!result.success)
    expect(result.errorCode).toBe('EXTRACTION_FIELD_FAILURE')
  })

  it('reports a non-error thrown while loading', async () => {
    const result = await projectWithStage(codeExtractionStage('extraction.yml'), () => {
      throw 'plain failure'
    }).rebuildGraph()

    assert(!result.success)
    expect(result.reason).toBe('plain failure')
  })
})
