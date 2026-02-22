import {
  describe, it, expect 
} from 'vitest'
import { detectPerModuleConnections } from './detect-connections'
import { buildComponent } from './call-graph/call-graph-fixtures'
import { matchesGlob } from '../../../../platform/infra/glob-matching/minimatch-glob'
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
      },
      matchesGlob,
    )

    expect(result.links).toStrictEqual([
      expect.objectContaining({
        source: 'orders:useCase:PlaceOrder',
        target: 'orders:repository:OrderRepository',
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
      },
      matchesGlob,
    )

    expect(result.timings.callGraphMs).toBeGreaterThanOrEqual(0)
    expect(result.timings.configurableMs).toBeGreaterThanOrEqual(0)
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
      },
      matchesGlob,
    )

    expect(result.links).toStrictEqual([
      expect.objectContaining({
        source: 'orders:useCase:IncludedUseCase',
        target: 'orders:repository:IncludedRepo',
      }),
    ])
  })
})
