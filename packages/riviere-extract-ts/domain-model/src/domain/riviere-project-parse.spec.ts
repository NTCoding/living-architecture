import { assert, describe, expect, it } from 'vitest'
import { Project } from 'ts-morph'
import { ValidatedConfiguration } from '@living-architecture/riviere-extract-config-published-language'
import { RiviereProject } from './riviere-project'
import { ExtractionStage } from './extraction-stage'
import { MissingModuleSourceError } from './extraction-errors'

function createProject(): RiviereProject {
  const configurationResult = ValidatedConfiguration.parse({
    modules: [
      {
        api: { notUsed: true },
        domain: 'orders',
        domainOp: { notUsed: true },
        event: { notUsed: true },
        eventHandler: { notUsed: true },
        glob: '**/*.ts',
        name: 'orders',
        path: 'orders',
        ui: { notUsed: true },
        useCase: { notUsed: true },
      },
    ],
  })
  assert(configurationResult.success)
  const module = configurationResult.data.modules[0]
  assert(module)
  const stage = ExtractionStage.parse({
    name: 'orders',
    configPath: 'config.yml',
    useTsConfig: false,
    repositoryName: 'test-repo',
    resolvedConfig: configurationResult.data,
    moduleContexts: [{ module, project: new Project(), files: ['test.ts'] }],
  })
  const result = RiviereProject.parse({ stage })
  assert(result.success)
  return result.data
}

function expectMissingSource(operation: (project: RiviereProject) => unknown): void {
  const project = createProject()
  Object.defineProperty(project, 'moduleSources', { value: new Map() })
  expect(() => operation(project)).toThrowError(new MissingModuleSourceError('orders'))
}

describe('RiviereProject source invariants', () => {
  it('rejects extraction when a parsed project loses its module source', () => {
    expectMissingSource((project) =>
      project.extractDraftComponents({ allowIncomplete: true, includeConnections: false }),
    )
  })

  it('rejects enrichment when a parsed project loses its module source', () => {
    expectMissingSource((project) =>
      project.enrichDraftComponents({
        allowIncomplete: true,
        draftComponentsPath: 'draft-components.json',
        loadDraftComponents: () => ({ success: true, draftComponents: [] }),
        includeConnections: true,
      }),
    )
  })
})

describe('RiviereProject.parse', () => {
  it('describes missing and foreign module sources', () => {
    const configurationResult = ValidatedConfiguration.parse({
      modules: [
        {
          api: { notUsed: true },
          domain: 'orders',
          domainOp: { notUsed: true },
          event: { notUsed: true },
          eventHandler: { notUsed: true },
          glob: '**/*.ts',
          name: 'orders',
          path: 'orders',
          ui: { notUsed: true },
          useCase: { notUsed: true },
        },
        {
          api: { notUsed: true },
          domain: 'billing',
          domainOp: { notUsed: true },
          event: { notUsed: true },
          eventHandler: { notUsed: true },
          glob: '**/*.ts',
          name: 'billing',
          path: 'billing',
          ui: { notUsed: true },
          useCase: { notUsed: true },
        },
      ],
    })
    assert(configurationResult.success)
    const orders = configurationResult.data.modules[0]
    const billing = configurationResult.data.modules[1]
    assert(orders)
    assert(billing)
    const stage = ExtractionStage.parse({
      name: 'test',
      configPath: 'config.yml',
      useTsConfig: false,
      repositoryName: 'test-repo',
      resolvedConfig: configurationResult.data,
      moduleContexts: [
        { module: orders, project: new Project(), files: [] },
        { module: billing, project: new Project(), files: [] },
      ],
    })
    Object.assign(stage, {
      resolvedConfig: { ...configurationResult.data, modules: [orders] },
      moduleContexts: [{ module: billing, project: new Project(), files: [] }],
    })

    expect(RiviereProject.parse({ stage })).toStrictEqual({
      success: false,
      error: "Missing source for module 'orders'\nSource supplied for unknown module 'billing'",
    })
  })
})
