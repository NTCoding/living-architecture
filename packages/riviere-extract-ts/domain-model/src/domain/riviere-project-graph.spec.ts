import { ValidatedConfiguration } from '@living-architecture/riviere-extract-config-published-language'
import { Project } from 'ts-morph'
import { assert, describe, expect, it } from 'vitest'
import { ExtractionConfiguration } from './extraction-configuration'
import { MissingModuleSourceError } from './extraction-errors'
import { RiviereModule } from './riviere-module'
import { RiviereProject } from './riviere-project'
import { collaborators } from './__fixtures__/workflow-fixtures'
import {
  ExtractionConfigurationUnavailableError,
  GraphStateUnavailableError,
} from './riviere-project-errors'

function graphProject(): RiviereProject {
  const result = RiviereProject.start(
    {
      graphDefinition: {
        sources: [{ repository: 'shop' }],
        domains: {
          orders: { description: 'Orders', systemType: 'domain' },
        },
      },
    },
    collaborators(),
  )
  assert(result.success)
  return result.project
}

function extractionConfiguration(): ExtractionConfiguration {
  const parsed = ValidatedConfiguration.parse({
    modules: [
      {
        api: { notUsed: true },
        domain: 'orders',
        domainOp: { notUsed: true },
        event: { notUsed: true },
        eventHandler: { notUsed: true },
        glob: '**/*.ts',
        name: 'orders',
        path: '.',
        ui: { notUsed: true },
        useCase: { notUsed: true },
      },
    ],
  })
  assert(parsed.success)
  const module = parsed.data.modules[0]
  assert(module)
  return ExtractionConfiguration.parse({
    name: 'orders',
    configPath: 'orders.yml',
    useTsConfig: false,
    repositoryName: 'shop',
    resolvedConfig: parsed.data,
    moduleContexts: [{ module, project: new Project(), files: [] }],
  })
}

function addEveryComponent(subject: RiviereProject): readonly string[] {
  const location = { repository: 'shop', filePath: 'orders.ts' }
  const ids: string[] = []
  subject.amendGraph((builder) => {
    builder.defineCustomType({ name: 'ScheduledJob' })
    ids.push(
      builder.addUI({
        name: 'Orders page',
        domain: 'orders',
        module: 'orders',
        sourceLocation: location,
        route: '/orders',
      }).id,
      builder.addApi({
        name: 'Orders API',
        domain: 'orders',
        module: 'orders',
        sourceLocation: location,
        apiType: 'REST',
      }).id,
      builder.addUseCase({
        name: 'Place order',
        domain: 'orders',
        module: 'orders',
        sourceLocation: location,
      }).id,
      builder.addDomainOp({
        name: 'Create order',
        domain: 'orders',
        module: 'orders',
        sourceLocation: location,
        operationName: 'createOrder',
      }).id,
      builder.addEvent({
        name: 'Order placed',
        domain: 'orders',
        module: 'orders',
        sourceLocation: location,
        eventName: 'OrderPlaced',
      }).id,
      builder.addEventHandler({
        name: 'Notify customer',
        domain: 'orders',
        module: 'orders',
        sourceLocation: location,
        subscribedEvents: ['OrderPlaced'],
      }).id,
      builder.addCustom({
        name: 'Expire orders',
        domain: 'orders',
        module: 'orders',
        sourceLocation: location,
        customTypeName: 'ScheduledJob',
      }).id,
    )
  })
  return ids
}

describe('RiviereProject graph behaviour', () => {
  it('delegates graph construction through its private builder', () => {
    const subject = graphProject()
    subject.amendGraph((builder) => {
      builder.addSource({ repository: 'catalogue' })
      builder.addDomain({ name: 'shipping', description: 'Shipping', systemType: 'domain' })
      builder.defineRelationshipType({ name: 'invokes', description: 'Invokes' })
    })
    const [from, to, , operation] = addEveryComponent(subject)
    assert(from)
    assert(to)
    assert(operation)
    subject.amendGraph((builder) => {
      builder.enrichComponent(operation, {
        entity: 'Order',
        stateChanges: [{ from: 'draft', to: 'created' }],
        businessRules: ['Order must be valid'],
        behavior: { modifies: ['Order'] },
        signature: { parameters: [], returnType: 'Order' },
      })
      builder.link({ from, to, relationshipType: 'invokes' })
      builder.linkExternal({ from, target: { name: 'Payments', repository: 'payments' } })
    })

    const graph = subject.build()
    expect({
      components: graph.components.length,
      links: graph.links.length,
      externalLinks: graph.externalLinks?.length ?? 0,
      sources: graph.metadata.sources,
      domains: Object.keys(graph.metadata.domains),
      valid: subject.amendGraph((builder) => builder.validate().valid),
      serialised: JSON.parse(subject.serialize()),
      warnings: subject.amendGraph((builder) => builder.warnings()),
    }).toMatchObject({
      components: 7,
      links: 1,
      externalLinks: 1,
      sources: [{ repository: 'shop' }, { repository: 'catalogue' }],
      domains: ['orders', 'shipping'],
      valid: true,
      serialised: { components: expect.any(Array) },
      warnings: expect.any(Array),
    })
  })

  it('rejects graph behaviour on an extraction only project', () => {
    const configuration = extractionConfiguration()
    const started = RiviereProject.start({ configuration, draftComponents: [] }, collaborators())
    assert(started.success)

    expect(() => started.project.build()).toThrowError(new GraphStateUnavailableError())
  })

  it('rejects graph metadata mutations on an extraction only project', () => {
    const configuration = extractionConfiguration()
    const started = RiviereProject.start({ configuration, draftComponents: [] }, collaborators())
    assert(started.success)

    expect(() =>
      started.project.amendGraph((builder) => builder.addSource({ repository: 'catalogue' })),
    ).toThrowError(new GraphStateUnavailableError())
  })

  it('rejects extraction behaviour on a graph only project', () => {
    expect(() => graphProject().detectConnections([], false)).toThrowError(
      new ExtractionConfigurationUnavailableError(),
    )
  })

  it('rejects direct module construction when its source context is missing', () => {
    const configuration = extractionConfiguration()
    Object.assign(configuration, { moduleContexts: [] })

    expect(() => RiviereModule.fromConfiguration(configuration, [])).toThrowError(
      new MissingModuleSourceError('orders'),
    )
  })
})
