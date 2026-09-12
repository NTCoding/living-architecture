import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RiviereProject } from '@living-architecture/riviere-extract-ts-domain-model/domain/riviere-project'
import {
  type TestContext,
  createTestContext,
  setupCommandTest,
} from '../../../__fixtures__/command-test-fixtures'
import { AddComponent } from './add-component'
import { AddSource } from './add-source'
import { CheckConsistency } from './check-consistency'
import { DefineCustomType } from './define-custom-type'
import { EnrichComponent } from './enrich-component'
import { FinalizeGraph } from './finalize-graph'
import { LinkComponents } from './link-components'
import { RiviereProjectRepository } from '../data-access/riviere-project/riviere-project-repository'
import { ValidateGraph } from './validate-graph'

function createProject(): RiviereProject {
  return RiviereProject.start({
    graphDefinition: {
      domains: { orders: { description: 'Orders', systemType: 'domain' } },
      sources: [{ repository: 'https://github.com/org/repo' }],
    },
  }).data
}

describe('final command coverage', () => {
  const ctx: TestContext = createTestContext()
  setupCommandTest(ctx)
  afterEach(() => vi.restoreAllMocks())

  it('returns invalid component type from enrich', () => {
    const project = createProject()
    const { id } = project.amendGraph((builder) =>
      builder.addUI({
        domain: 'orders',
        module: 'core',
        name: 'OrdersPage',
        route: '/orders',
        sourceLocation: { repository: 'https://github.com/org/repo', filePath: 'src/orders.ts' },
      }),
    )
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    const empty = {
      businessRules: [],
      entity: undefined,
      emits: [],
      graphFileLocation: join(ctx.testDir, '.riviere', 'graph.json'),
      modifies: [],
      reads: [],
      signature: undefined,
      stateChanges: [],
      validates: [],
    }
    expect(
      new EnrichComponent(new RiviereProjectRepository()).execute({ ...empty, id }).result,
    ).toMatchObject({ code: 'INVALID_COMPONENT_TYPE', success: false })
  })

  it('returns component not found from enrich', () => {
    const project = createProject()
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    const empty = {
      businessRules: [],
      entity: undefined,
      emits: [],
      graphFileLocation: join(ctx.testDir, '.riviere', 'graph.json'),
      modifies: [],
      reads: [],
      signature: undefined,
      stateChanges: [],
      validates: [],
    }
    expect(
      new EnrichComponent(new RiviereProjectRepository()).execute({
        ...empty,
        id: 'orders:core:domainop:nope',
      }).result,
    ).toMatchObject({ code: 'COMPONENT_NOT_FOUND', success: false })
  })

  it('returns component not found from link-components', () => {
    const project = createProject()
    project.amendGraph((builder) =>
      builder.addApi({
        apiType: 'REST',
        domain: 'orders',
        httpMethod: 'POST',
        module: 'core',
        name: 'CreateOrder',
        path: '/orders',
        sourceLocation: {
          repository: 'https://github.com/org/repo',
          filePath: 'src/create-order.ts',
        },
      }),
    )
    project.amendGraph((builder) =>
      builder.defineRelationshipType({ name: 'reads', description: 'Reads' }),
    )
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    const graphFileLocation = join(ctx.testDir, '.riviere', 'graph.json')
    expect(
      new LinkComponents(new RiviereProjectRepository()).execute({
        from: 'orders:core:usecase:missing',
        graphFileLocation,
        relationshipType: 'reads',
        targetDomain: 'orders',
        targetModule: 'core',
        targetName: 'CreateOrder',
        targetType: 'Api',
        type: 'sync',
      }).result,
    ).toMatchObject({ code: 'COMPONENT_NOT_FOUND', success: false })
  })

  it('returns validation error from link-components for an invalid type', () => {
    const project = createProject()
    project.amendGraph((builder) =>
      builder.addApi({
        apiType: 'REST',
        domain: 'orders',
        httpMethod: 'POST',
        module: 'core',
        name: 'CreateOrder',
        path: '/orders',
        sourceLocation: {
          repository: 'https://github.com/org/repo',
          filePath: 'src/create-order.ts',
        },
      }),
    )
    project.amendGraph((builder) =>
      builder.defineRelationshipType({ name: 'reads', description: 'Reads' }),
    )
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    const graphFileLocation = join(ctx.testDir, '.riviere', 'graph.json')
    expect(
      new LinkComponents(new RiviereProjectRepository()).execute({
        from: 'orders:core:usecase:missing',
        graphFileLocation,
        targetDomain: 'orders',
        targetModule: 'core',
        targetName: 'x',
        targetType: 'UseCase',
        type: 'bogus',
      }).result,
    ).toMatchObject({ code: 'VALIDATION_ERROR', success: false })
  })

  it('returns a validation error from define-custom-type for a duplicate custom type', () => {
    const project = createProject()
    project.amendGraph((builder) => builder.defineCustomType({ name: 'Queue' }))
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    const result = new DefineCustomType(new RiviereProjectRepository()).execute({
      description: undefined,
      graphFileLocation: join(ctx.testDir, '.riviere', 'graph.json'),
      name: 'Queue',
      optionalProperties: {},
      requiredProperties: {},
    })
    expect(result.result).toMatchObject({ code: 'VALIDATION_ERROR', success: false })
  })

  it('returns custom type not found from add-component', () => {
    const project = createProject()
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    const result = new AddComponent(new RiviereProjectRepository()).execute({
      componentType: 'Custom',
      customProperty: ['priority: high'],
      customType: 'Foo',
      domain: 'orders',
      filePath: 'f',
      graphFileLocation: join(ctx.testDir, '.riviere', 'graph.json'),
      module: 'core',
      name: 'queue',
      repository: 'r',
    })
    expect(result.result).toMatchObject({ code: 'CUSTOM_TYPE_NOT_FOUND', success: false })
  })

  it('returns duplicate component from add-component', () => {
    const project = createProject()
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    const base = {
      componentType: 'UseCase',
      description: 'x',
      domain: 'orders',
      filePath: 'f',
      graphFileLocation: join(ctx.testDir, '.riviere', 'graph.json'),
      module: 'core',
      name: 'Place',
      repository: 'r',
    }
    new AddComponent(new RiviereProjectRepository()).execute(base)
    expect(new AddComponent(new RiviereProjectRepository()).execute(base).result).toMatchObject({
      code: 'DUPLICATE_COMPONENT',
      success: false,
    })
  })

  it('defines a custom type without property descriptions', () => {
    const project = createProject()
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    const result = new DefineCustomType(new RiviereProjectRepository()).execute({
      description: undefined,
      graphFileLocation: join(ctx.testDir, '.riviere', 'graph.json'),
      name: 'Queue',
      optionalProperties: { a: { type: 'string' } },
      requiredProperties: { b: { type: 'number' } },
    })
    expect(result.result.success).toBe(true)
  })

  it('returns graph corrupted from check-consistency', async () => {
    const { mkdir, writeFile } = await import('node:fs/promises')
    await mkdir(join(ctx.testDir, '.riviere'), { recursive: true })
    await writeFile(join(ctx.testDir, '.riviere', 'graph.json'), '{invalid', 'utf-8')
    expect(
      new CheckConsistency(new RiviereProjectRepository()).execute({
        graphFileLocation: join(ctx.testDir, '.riviere', 'graph.json'),
      }).result,
    ).toMatchObject({ code: 'GRAPH_CORRUPTED', success: false })
  })

  it('defines a custom type with a description', () => {
    const project = createProject()
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    const result = new DefineCustomType(new RiviereProjectRepository()).execute({
      description: 'A deferred unit of work',
      graphFileLocation: join(ctx.testDir, '.riviere', 'graph.json'),
      name: 'Queue',
      optionalProperties: {},
      requiredProperties: {},
    })
    expect(result.result.success).toBe(true)
  })

  it('returns graph not found from check-consistency', () => {
    expect(
      new CheckConsistency(new RiviereProjectRepository()).execute({
        graphFileLocation: join(ctx.testDir, '.riviere', 'graph.json'),
      }).result,
    ).toMatchObject({ code: 'GRAPH_NOT_FOUND', success: false })
  })

  it('rethrows unexpected errors from check-consistency', () => {
    const project = createProject()
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    vi.spyOn(project, 'amendGraph').mockImplementation(() => {
      throw 'boom'
    })
    expect(() =>
      new CheckConsistency(new RiviereProjectRepository()).execute({
        graphFileLocation: join(ctx.testDir, '.riviere', 'graph.json'),
      }),
    ).toThrow('boom')
  })

  it('checks consistency on a valid graph', () => {
    const project = createProject()
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    const result = new CheckConsistency(new RiviereProjectRepository()).execute({
      graphFileLocation: join(ctx.testDir, '.riviere', 'graph.json'),
    })
    expect(result.result.success).toBe(true)
  })

  it('returns graph not found from add-source', () => {
    const g = join(ctx.testDir, '.riviere', 'graph.json')
    expect(
      new AddSource(new RiviereProjectRepository()).execute({
        graphFileLocation: g,
        repository: 'https://github.com/org/x',
      }).result,
    ).toMatchObject({ code: 'GRAPH_NOT_FOUND', success: false })
  })

  it('returns graph not found from check-consistency', () => {
    const g = join(ctx.testDir, '.riviere', 'graph.json')
    expect(
      new CheckConsistency(new RiviereProjectRepository()).execute({ graphFileLocation: g }).result,
    ).toMatchObject({ code: 'GRAPH_NOT_FOUND', success: false })
  })

  it('returns graph not found from validate-graph', () => {
    const g = join(ctx.testDir, '.riviere', 'graph.json')
    expect(
      new ValidateGraph(new RiviereProjectRepository()).execute({ graphFileLocation: g }).result,
    ).toMatchObject({ code: 'GRAPH_NOT_FOUND', success: false })
  })

  it('returns graph not found from finalize-graph', () => {
    const g = join(ctx.testDir, '.riviere', 'graph.json')
    expect(
      new FinalizeGraph(new RiviereProjectRepository()).execute({
        graphFileLocation: g,
        outputPath: '/out',
      }).result,
    ).toMatchObject({ code: 'GRAPH_NOT_FOUND', success: false })
  })

  it('returns graph not found from enrich', () => {
    const g = join(ctx.testDir, '.riviere', 'graph.json')
    expect(
      new EnrichComponent(new RiviereProjectRepository()).execute({
        businessRules: [],
        entity: undefined,
        emits: [],
        graphFileLocation: g,
        id: 'orders:core:domainop:place-order',
        modifies: [],
        reads: [],
        signature: undefined,
        stateChanges: [],
        validates: [],
      }).result,
    ).toMatchObject({ code: 'GRAPH_NOT_FOUND', success: false })
  })
})
