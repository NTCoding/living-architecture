import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { RiviereProject } from '@living-architecture/riviere-extract-ts-domain-model/domain/riviere-project'
import {
  type TestContext,
  createTestContext,
  setupCommandTest,
} from '../../../__fixtures__/command-test-fixtures'
import { DefineCustomType } from './define-custom-type'
import { EnrichComponent } from './enrich-component'
import { FinalizeGraph } from './finalize-graph'
import { InitGraph } from './init-graph'
import { LinkComponents } from './link-components'
import { LinkExternal } from './link-external'
import { RiviereProjectRepository } from '../data-access/riviere-project/riviere-project-repository'

class UnexpectedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnexpectedError'
  }
}

async function createInvalidGraph(testDir: string): Promise<string> {
  const graphDir = join(testDir, '.riviere')
  await mkdir(graphDir, { recursive: true })
  const graphPath = join(graphDir, 'graph.json')
  await writeFile(graphPath, '{invalid', 'utf-8')
  return graphPath
}

function createProject(): RiviereProject {
  return RiviereProject.start({
    graphDefinition: {
      domains: {
        orders: {
          description: 'Orders',
          systemType: 'domain',
        },
      },
      sources: [{ repository: 'https://github.com/org/repo' }],
    },
  }).data
}

describe('additional builder command coverage', () => {
  const ctx: TestContext = createTestContext()
  setupCommandTest(ctx)

  it('returns graph corrupted for finalize, link components, and link external', async () => {
    const graphPath = await createInvalidGraph(ctx.testDir)

    const repo = new RiviereProjectRepository()
    expect(
      new FinalizeGraph(repo).execute({ graphFileLocation: graphPath, outputPath: 'graph.json' }),
    ).toMatchObject({
      result: { code: 'GRAPH_CORRUPTED' },
    })
    expect(
      new LinkComponents(repo).execute({
        from: 'orders:core:api:source',
        graphFileLocation: graphPath,
        targetDomain: 'orders',
        targetModule: 'core',
        targetName: 'Place Order',
        targetType: 'UseCase',
        type: undefined,
      }),
    ).toMatchObject({ result: { code: 'GRAPH_CORRUPTED' } })
    expect(
      new LinkExternal(repo).execute({
        from: 'orders:core:api:source',
        graphFileLocation: graphPath,
        targetDomain: undefined,
        targetName: 'Stripe',
        targetUrl: undefined,
        type: undefined,
      }),
    ).toMatchObject({ result: { code: 'GRAPH_CORRUPTED' } })
  })

  it('returns duplicate custom type validation error', () => {
    const project = createProject()
    project.defineCustomType({ name: 'Queue' })
    vi.spyOn(RiviereProjectRepository.prototype, 'loadByGraphPath').mockReturnValue(project)

    expect(
      new DefineCustomType(new RiviereProjectRepository()).execute({
        description: undefined,
        graphFileLocation: join(ctx.testDir, '.riviere', 'graph.json'),
        name: 'Queue',
        optionalProperties: {},
        requiredProperties: {},
      }),
    ).toMatchObject({
      result: {
        code: 'VALIDATION_ERROR',
        success: false,
      },
    })
  })

  it('rejects an invalid optional custom property type', () => {
    expect(
      new DefineCustomType(new RiviereProjectRepository()).execute({
        description: undefined,
        graphFileLocation: join(ctx.testDir, '.riviere', 'graph.json'),
        name: 'Queue',
        optionalProperties: { retries: { type: 'not-a-property-type' } },
        requiredProperties: {},
      }),
    ).toMatchObject({
      result: {
        code: 'VALIDATION_ERROR',
        success: false,
      },
    })
  })

  it('returns validation errors for duplicate Links and undefined relationship types', () => {
    const project = createProject()
    const sourceId = project.addComponent({
      type: 'UseCase',
      input: {
        domain: 'orders',
        module: 'checkout',
        name: 'Create Order',
        sourceLocation: {
          repository: 'https://github.com/org/repo',
          filePath: 'src/create-order.ts',
        },
      },
    })
    vi.spyOn(RiviereProjectRepository.prototype, 'loadByGraphPath').mockReturnValue(project)
    const command = new LinkComponents(new RiviereProjectRepository())
    const input = {
      from: sourceId,
      graphFileLocation: join(ctx.testDir, '.riviere', 'graph.json'),
      targetDomain: 'orders',
      targetModule: 'checkout',
      targetName: 'Create Order',
      targetType: 'UseCase',
      type: undefined,
    } satisfies import('./link-components-input').LinkComponentsInput

    expect(command.execute(input)).toMatchObject({ result: { success: true } })
    expect(command.execute(input)).toMatchObject({
      result: {
        code: 'VALIDATION_ERROR',
        success: false,
      },
    })
    expect(
      command.execute({
        ...input,
        relationshipType: 'reads',
        sourceLocation: {
          repository: 'https://github.com/org/repo',
          filePath: 'src/create-order.ts',
          lineNumber: 1,
          columnNumber: 1,
        },
      }),
    ).toMatchObject({
      result: {
        code: 'VALIDATION_ERROR',
        success: false,
      },
    })
  })

  it('returns graph not found for define-custom-type and enrich-component', () => {
    const missingGraphPath = join(ctx.testDir, 'missing.json')

    const repo = new RiviereProjectRepository()
    expect(
      new DefineCustomType(repo).execute({
        description: undefined,
        graphFileLocation: missingGraphPath,
        name: 'Queue',
        optionalProperties: {},
        requiredProperties: {},
      }),
    ).toMatchObject({
      result: {
        code: 'GRAPH_NOT_FOUND',
        success: false,
      },
    })

    expect(
      new EnrichComponent(repo).execute({
        businessRules: [],
        entity: undefined,
        emits: [],
        graphFileLocation: missingGraphPath,
        id: 'orders:checkout:domainop:place-order',
        modifies: [],
        reads: [],
        signature: undefined,
        stateChanges: [],
        validates: [],
      }),
    ).toMatchObject({
      result: {
        code: 'GRAPH_NOT_FOUND',
        success: false,
      },
    })
  })

  it('includes reads in enrichment behavior', () => {
    const project = createProject()
    const enrichSpy = vi.spyOn(project, 'enrichComponent').mockImplementation(() => undefined)
    vi.spyOn(RiviereProjectRepository.prototype, 'loadByGraphPath').mockReturnValue(project)

    new EnrichComponent(new RiviereProjectRepository()).execute({
      businessRules: [],
      entity: undefined,
      emits: [],
      graphFileLocation: join(ctx.testDir, '.riviere', 'graph.json'),
      id: 'orders:checkout:domainop:place-order',
      modifies: [],
      reads: ['order.items'],
      signature: undefined,
      stateChanges: [],
      validates: [],
    })

    expect(enrichSpy).toHaveBeenCalledWith('orders:checkout:domainop:place-order', {
      behavior: { reads: ['order.items'] },
    })
  })

  it('includes validates in enrichment behavior', () => {
    const project = createProject()
    const enrichSpy = vi.spyOn(project, 'enrichComponent').mockImplementation(() => undefined)
    vi.spyOn(RiviereProjectRepository.prototype, 'loadByGraphPath').mockReturnValue(project)

    new EnrichComponent(new RiviereProjectRepository()).execute({
      businessRules: [],
      entity: undefined,
      emits: [],
      graphFileLocation: join(ctx.testDir, '.riviere', 'graph.json'),
      id: 'orders:checkout:domainop:place-order',
      modifies: [],
      reads: [],
      signature: undefined,
      stateChanges: [],
      validates: ['order.total'],
    })

    expect(enrichSpy).toHaveBeenCalledWith('orders:checkout:domainop:place-order', {
      behavior: { validates: ['order.total'] },
    })
  })

  it('returns graph corrupted for define-custom-type and enrich-component', async () => {
    const graphPath = await createInvalidGraph(ctx.testDir)

    const repo = new RiviereProjectRepository()
    expect(
      new DefineCustomType(repo).execute({
        description: undefined,
        graphFileLocation: graphPath,
        name: 'Queue',
        optionalProperties: {},
        requiredProperties: {},
      }),
    ).toMatchObject({
      result: {
        code: 'GRAPH_CORRUPTED',
        success: false,
      },
    })

    expect(
      new EnrichComponent(repo).execute({
        businessRules: [],
        entity: undefined,
        emits: [],
        graphFileLocation: graphPath,
        id: 'orders:checkout:domainop:place-order',
        modifies: [],
        reads: [],
        signature: undefined,
        stateChanges: [],
        validates: [],
      }),
    ).toMatchObject({
      result: {
        code: 'GRAPH_CORRUPTED',
        success: false,
      },
    })
  })

  it('rethrows unknown errors from finalize-graph and init-graph', () => {
    vi.spyOn(RiviereProjectRepository.prototype, 'loadByGraphPath').mockImplementation(() => {
      throw new UnexpectedError('unexpected')
    })

    const repo = new RiviereProjectRepository()
    expect(() =>
      new FinalizeGraph(repo).execute({
        graphFileLocation: join(ctx.testDir, '.riviere', 'graph.json'),
        outputPath: 'graph.json',
      }),
    ).toThrow('unexpected')

    expect(() =>
      new InitGraph(repo).execute({
        domains: [
          {
            description: 'Orders',
            name: 'orders',
            systemType: 'domain',
          },
        ],
        graphFileLocation: join(ctx.testDir, '.riviere', 'graph.json'),
        name: undefined,
        sources: ['https://github.com/org/repo'],
      }),
    ).toThrow('unexpected')
  })
})
