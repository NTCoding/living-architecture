import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RiviereProject } from '@living-architecture/riviere-extract-ts-domain-model/domain/riviere-project'
import {
  type TestContext,
  collaborators,
  createTestContext,
  setupCommandTest,
} from '../../../__fixtures__/command-test-fixtures'
import { LinkHttp } from './link-http'
import { RiviereProjectRepository } from '../data-access/riviere-project/riviere-project-repository'

function createProject(): RiviereProject {
  return RiviereProject.start(
    {
      graphDefinition: {
        domains: { orders: { description: 'Orders', systemType: 'domain' } },
        sources: [{ repository: 'https://github.com/org/repo' }],
      },
    },
    collaborators(),
  ).data
}

function createProjectWithApi(): RiviereProject {
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
  return project
}

describe('link-http command', () => {
  const ctx: TestContext = createTestContext()
  setupCommandTest(ctx)
  afterEach(() => vi.restoreAllMocks())

  function graphLocation(): string {
    return join(ctx.testDir, '.riviere', 'graph.json')
  }

  it('links an http route', () => {
    const project = createProjectWithApi()
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    const result = new LinkHttp(new RiviereProjectRepository()).execute({
      graphFileLocation: graphLocation(),
      httpMethod: 'POST',
      linkType: 'sync',
      path: '/orders',
      targetDomain: 'orders',
      targetModule: 'core',
      targetName: 'Place Order',
      targetType: 'UseCase',
    })
    expect(result.result.success).toBe(true)
  })

  it('returns validation error for invalid input', () => {
    expect(
      new LinkHttp(new RiviereProjectRepository()).execute({
        graphFileLocation: graphLocation(),
        httpMethod: undefined,
        linkType: undefined,
        path: '/orders',
        targetDomain: 'orders',
        targetModule: 'core',
        targetName: 'Place Order',
        targetType: 'Bogus',
      }).result,
    ).toMatchObject({ code: 'VALIDATION_ERROR', success: false })
  })

  it('returns component not found for a missing path', () => {
    const project = createProjectWithApi()
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    expect(
      new LinkHttp(new RiviereProjectRepository()).execute({
        graphFileLocation: graphLocation(),
        httpMethod: undefined,
        linkType: undefined,
        path: '/missing',
        targetDomain: 'orders',
        targetModule: 'core',
        targetName: 'Place Order',
        targetType: 'UseCase',
      }).result,
    ).toMatchObject({ code: 'COMPONENT_NOT_FOUND', success: false })
  })

  it('returns validation error for an invalid method', () => {
    const project = createProjectWithApi()
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    expect(
      new LinkHttp(new RiviereProjectRepository()).execute({
        graphFileLocation: graphLocation(),
        httpMethod: 'invalid',
        linkType: undefined,
        path: '/orders',
        targetDomain: 'orders',
        targetModule: 'core',
        targetName: 'Place Order',
        targetType: 'UseCase',
      }).result,
    ).toMatchObject({ code: 'VALIDATION_ERROR', success: false })
  })

  it('returns validation error for an invalid link type', () => {
    const project = createProjectWithApi()
    vi.spyOn(RiviereProjectRepository.prototype, 'load').mockReturnValue(project)
    expect(
      new LinkHttp(new RiviereProjectRepository()).execute({
        graphFileLocation: graphLocation(),
        httpMethod: undefined,
        linkType: 'invalid',
        path: '/orders',
        targetDomain: 'orders',
        targetModule: 'core',
        targetName: 'Place Order',
        targetType: 'UseCase',
      }).result,
    ).toMatchObject({ code: 'VALIDATION_ERROR', success: false })
  })
})
