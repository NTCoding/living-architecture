import {
  describe, it, expect 
} from 'vitest'
import { detectPerModuleConnections } from './detect-connections'
import { buildComponent } from './call-graph/call-graph-fixtures'
import { matchesGlob } from '../../../../platform/infra/external-clients/minimatch/minimatch-glob'
import { createProject } from './detect-connections-fixtures'

describe('detectPerModuleConnections', () => {
  it('returns sync links from call graph without async links', () => {
    const project = createProject()
    const filePath = '/src/per-module.ts'
    project.createSourceFile(
      filePath,
      `
class OrderRepository {
  save(): void {}
}

class PlaceOrder {
  private repo: OrderRepository
  constructor(repo: OrderRepository) { this.repo = repo }
  execute(): void {
    this.repo.save()
  }
}
`,
    )
    const repo = buildComponent('OrderRepository', filePath, 2, { type: 'repository' })
    const useCase = buildComponent('PlaceOrder', filePath, 6)
    const event = buildComponent('OrderPlacedEvent', '/src/event.ts', 1, {
      type: 'event',
      metadata: { eventName: 'OrderPlacedEvent' },
    })
    const handler = buildComponent('OrderPlacedHandler', '/src/handler.ts', 1, {
      type: 'eventHandler',
      metadata: { subscribedEvents: ['OrderPlacedEvent'] },
    })

    const result = detectPerModuleConnections(
      project,
      [repo, useCase, event, handler],
      {
        repository: 'test-repo',
        moduleGlobs: ['/src/**/*.ts'],
        allComponents: [repo, useCase, event, handler],
      },
      matchesGlob,
    )

    expect(result.links).toStrictEqual([
      expect.objectContaining({
        source: 'orders:orders-module:useCase:placeorder',
        target: 'orders:orders-module:repository:orderrepository',
        type: 'sync',
      }),
    ])
  })

  it('supports module-local detection without allComponents option', () => {
    const project = createProject()
    const filePath = '/src/local-only.ts'
    project.createSourceFile(
      filePath,
      `
class OrderRepository {
  save(): void {}
}

class PlaceOrder {
  private repo: OrderRepository
  constructor(repo: OrderRepository) { this.repo = repo }
  execute(): void {
    this.repo.save()
  }
}
`,
    )
    const repo = buildComponent('OrderRepository', filePath, 2, { type: 'repository' })
    const useCase = buildComponent('PlaceOrder', filePath, 6)

    const result = detectPerModuleConnections(
      project,
      [repo, useCase],
      {
        repository: 'test-repo',
        moduleGlobs: ['/src/**/*.ts'],
      },
      matchesGlob,
    )

    expect(result.links).toStrictEqual([
      expect.objectContaining({
        source: 'orders:orders-module:useCase:placeorder',
        target: 'orders:orders-module:repository:orderrepository',
        type: 'sync',
      }),
    ])
  })

  it('returns empty links for empty components array', () => {
    const project = createProject()
    project.createSourceFile('/src/empty-per-module.ts', '')

    const result = detectPerModuleConnections(
      project,
      [],
      {
        repository: 'test-repo',
        moduleGlobs: ['/src/**/*.ts'],
        allComponents: [],
      },
      matchesGlob,
    )

    expect(result.links).toStrictEqual([])
  })

  it('returns non-negative timing values', () => {
    const project = createProject()
    project.createSourceFile('/src/timing-per-module.ts', '')

    const result = detectPerModuleConnections(
      project,
      [],
      {
        repository: 'test-repo',
        moduleGlobs: ['/src/**/*.ts'],
        allComponents: [],
      },
      matchesGlob,
    )

    expect(result.timings.callGraphMs).toBeGreaterThanOrEqual(0)
    expect(result.timings.setupMs).toBeGreaterThanOrEqual(0)
  })

  it('respects moduleGlobs filtering', () => {
    const project = createProject()
    const includedFile = '/src/included/comp.ts'
    const excludedFile = '/src/excluded/comp.ts'
    project.createSourceFile(
      includedFile,
      `
class IncludedRepo {
  save(): void {}
}

class IncludedUseCase {
  private repo: IncludedRepo
  constructor(repo: IncludedRepo) { this.repo = repo }
  execute(): void { this.repo.save() }
}
`,
    )
    project.createSourceFile(
      excludedFile,
      `
class ExcludedRepo {
  save(): void {}
}

class ExcludedUseCase {
  private repo: ExcludedRepo
  constructor(repo: ExcludedRepo) { this.repo = repo }
  execute(): void { this.repo.save() }
}
`,
    )
    const repo = buildComponent('IncludedRepo', includedFile, 2, { type: 'repository' })
    const useCase = buildComponent('IncludedUseCase', includedFile, 6)

    const result = detectPerModuleConnections(
      project,
      [repo, useCase],
      {
        repository: 'test-repo',
        moduleGlobs: ['/src/included/**/*.ts'],
        allComponents: [repo, useCase],
      },
      matchesGlob,
    )

    expect(result.links).toStrictEqual([
      expect.objectContaining({
        source: 'orders:orders-module:useCase:includedusecase',
        target: 'orders:orders-module:repository:includedrepo',
      }),
    ])
  })

  it('returns sync link to component in another module when allComponents includes target', () => {
    const project = createProject()
    project.createSourceFile(
      '/src/orders/repository.ts',
      `
export class OrdersRepository {
  save(): void {}
}
`,
    )
    project.createSourceFile(
      '/src/bff/use-case.ts',
      `
import { OrdersRepository } from '../orders/repository'

class PlaceOrder {
  private repo: OrdersRepository
  constructor(repo: OrdersRepository) { this.repo = repo }
  execute(): void {
    this.repo.save()
  }
}
`,
    )

    const useCase = buildComponent('PlaceOrder', '/src/bff/use-case.ts', 4, { domain: 'bff' })
    const repository = buildComponent('OrdersRepository', '/src/orders/repository.ts', 2, {
      type: 'repository',
      domain: 'orders',
    })

    const result = detectPerModuleConnections(
      project,
      [useCase],
      {
        repository: 'test-repo',
        moduleGlobs: ['/src/bff/**/*.ts'],
        allComponents: [useCase, repository],
      },
      matchesGlob,
    )

    expect(result.links).toStrictEqual([
      expect.objectContaining({
        source: 'bff:orders-module:useCase:placeorder',
        target: 'orders:orders-module:repository:ordersrepository',
        type: 'sync',
      }),
    ])
  })
})
