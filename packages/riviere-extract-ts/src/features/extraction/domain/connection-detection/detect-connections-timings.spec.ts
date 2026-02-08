import {
  describe, it, expect 
} from 'vitest'
import { detectConnections } from './detect-connections'
import { buildComponent } from './call-graph/call-graph-fixtures'
import { matchesGlob } from '../../../../platform/infra/glob-matching/minimatch-glob'
import { createProject } from './detect-connections-fixtures'

describe('detectConnections - timing metrics', () => {
  it('returns zero configurableMs when no patterns provided', () => {
    const project = createProject()
    project.createSourceFile('/src/nopatterns.ts', '')

    const result = detectConnections(
      project,
      [],
      {
        repository: 'test-repo',
        moduleGlobs: ['/src/**/*.ts'],
      },
      matchesGlob,
    )

    expect(result.timings.configurableMs).toBe(0)
  })

  it('includes configurableMs timing when patterns are provided', () => {
    const project = createProject()
    project.createSourceFile(
      '/src/timing-cfg.ts',
      `
class SomeService {
  execute(): void {}
}
`,
    )
    const comp = buildComponent('SomeService', '/src/timing-cfg.ts', 2)

    const result = detectConnections(
      project,
      [comp],
      {
        moduleGlobs: ['/src/**/*.ts'],
        patterns: [
          {
            name: 'any-pattern',
            find: 'methodCalls',
            where: { methodName: 'anything' },
            linkType: 'sync',
          },
        ],
        repository: 'test-repo',
      },
      matchesGlob,
    )

    expect(result.timings.configurableMs).toBeGreaterThanOrEqual(0)
  })
})
