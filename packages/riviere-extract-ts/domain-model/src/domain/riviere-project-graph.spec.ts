import { ComponentDefinition } from '@living-architecture/riviere-builder-published-language'
import { ValidatedConfiguration } from '@living-architecture/riviere-extract-config-published-language'
import { Project } from 'ts-morph'
import { assert, describe, expect, it } from 'vitest'
import { ExtractionConfiguration } from './extraction-configuration'
import { MissingModuleSourceError } from './extraction-errors'
import { RiviereModule } from './riviere-module'
import { RiviereProject } from './riviere-project'
import {
  ExtractionConfigurationUnavailableError,
  GraphStateUnavailableError,
} from './riviere-project-errors'

function graphProject(): RiviereProject {
  return RiviereProject.start({
    graphDefinition: {
      sources: [{ repository: 'shop' }],
      domains: {
        orders: { description: 'Orders', systemType: 'domain' },
      },
    },
  }).data
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
  subject.defineCustomType({ name: 'ScheduledJob' })
  return [
    subject.addComponent(
      ComponentDefinition.parseUI({
        name: 'Orders page',
        domain: 'orders',
        module: 'orders',
        sourceLocation: location,
        route: '/orders',
      }).value,
    ),
    subject.addComponent(
      ComponentDefinition.parseAPI({
        name: 'Orders API',
        domain: 'orders',
        module: 'orders',
        sourceLocation: location,
        apiType: 'REST',
      }).value,
    ),
    subject.addComponent(
      ComponentDefinition.parseUseCase({
        name: 'Place order',
        domain: 'orders',
        module: 'orders',
        sourceLocation: location,
      }).value,
    ),
    subject.addComponent(
      ComponentDefinition.parseDomainOp({
        name: 'Create order',
        domain: 'orders',
        module: 'orders',
        sourceLocation: location,
        operationName: 'createOrder',
      }).value,
    ),
    subject.addComponent(
      ComponentDefinition.parseEvent({
        name: 'Order placed',
        domain: 'orders',
        module: 'orders',
        sourceLocation: location,
        eventName: 'OrderPlaced',
      }).value,
    ),
    subject.addComponent(
      ComponentDefinition.parseEventHandler({
        name: 'Notify customer',
        domain: 'orders',
        module: 'orders',
        sourceLocation: location,
        subscribedEvents: ['OrderPlaced'],
      }).value,
    ),
    subject.addComponent(
      ComponentDefinition.parseCustom({
        name: 'Expire orders',
        domain: 'orders',
        module: 'orders',
        sourceLocation: location,
        customTypeName: 'ScheduledJob',
      }).value,
    ),
  ]
}

describe('RiviereProject graph behaviour', () => {
  it('delegates graph construction through its private builder', () => {
    const subject = graphProject()
    subject.addSource({ repository: 'catalogue' })
    subject.addDomain({ name: 'shipping', description: 'Shipping', systemType: 'domain' })
    subject.defineRelationshipType({ name: 'invokes', description: 'Invokes' })
    const ids = addEveryComponent(subject)
    const operation = ids[3]
    assert(operation)
    subject.enrichComponent(operation, {
      entity: 'Order',
      stateChanges: [{ from: 'draft', to: 'created' }],
      businessRules: ['Order must be valid'],
      behavior: { modifies: ['Order'] },
      signature: { parameters: [], returnType: 'Order' },
    })
    const source = ids[0]
    const target = ids[1]
    assert(source)
    assert(target)
    subject.link({ from: source, to: target, relationshipType: 'invokes' })
    subject.linkExternal({ from: source, target: { name: 'Payments', repository: 'payments' } })

    const graph = subject.build()
    expect({
      components: graph.components.length,
      links: graph.links.length,
      externalLinks: graph.externalLinks?.length ?? 0,
      sources: graph.metadata.sources,
      domains: Object.keys(graph.metadata.domains),
      valid: subject.validate().valid,
      serialised: JSON.parse(subject.serialize()),
      warnings: subject.warnings(),
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
    const started = RiviereProject.start({ configuration, draftComponents: [] })
    assert(started.success)

    expect(() => started.data.build()).toThrowError(new GraphStateUnavailableError())
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
