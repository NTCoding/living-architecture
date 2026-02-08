import {
  describe, it, expect 
} from 'vitest'
import { matchesGlob } from '../../../../platform/infra/glob-matching/minimatch-glob'
import { buildComponent } from './call-graph/call-graph-fixtures'
import { detectConnections } from './detect-connections'
import { createProject } from './detect-connections-fixtures'

describe('detectConnections - cross-strategy deduplication', () => {
  it('deduplicates when call-graph and configurable pattern detect same link', () => {
    const project = createProject()
    project.createSourceFile(
      '/src/dedup-test.ts',
      `
class OrderRepo {
  save(): void {}
}
class CreateOrder {
  constructor(private repo: OrderRepo) {}
  execute(): void {
    this.repo.save()
  }
}
`,
    )
    const repo = buildComponent('OrderRepo', '/src/dedup-test.ts', 2, { type: 'repository' })
    const useCase = buildComponent('CreateOrder', '/src/dedup-test.ts', 5)

    const result = detectConnections(
      project,
      [repo, useCase],
      {
        repository: 'test-repo',
        moduleGlobs: ['/src/**/*.ts'],
        patterns: [
          {
            name: 'repo-save-pattern',
            find: 'methodCalls',
            where: { methodName: 'save' },
            linkType: 'sync',
          },
        ],
      },
      matchesGlob,
    )

    expect(result.links).toHaveLength(1)
    expect(result.links[0]).toMatchObject({
      source: 'orders:useCase:CreateOrder',
      target: 'orders:repository:OrderRepo',
      type: 'sync',
    })
  })
})
