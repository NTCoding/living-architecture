import {
  describe, expect, it 
} from 'vitest'
import { Project } from 'ts-morph'
import { buildComponent } from './call-graph/call-graph-fixtures'
import { detectPerModuleConnections } from './detect-connections'
import { matchesGlob } from '../../../../platform/infra/external-clients/minimatch/minimatch-glob'

describe('detectPerModuleConnections deduplication', () => {
  it('deduplicates external links when call graph and configurable detection find the same httpCall edge', () => {
    const project = new Project({ useInMemoryFileSystem: true })
    const filePath = '/src/orders/http.ts'
    project.createSourceFile(
      filePath,
      `
class Check {
  Check(): void {}
}

class PlaceOrder {
  private checkClient: Check
  constructor(checkClient: Check) { this.checkClient = checkClient }
  execute(): void {
    this.checkClient.Check()
  }
}
`,
    )

    const useCase = buildComponent('PlaceOrder', filePath, 6)
    const httpCall = buildComponent('Check', filePath, 2, {
      type: 'httpCall',
      metadata: {
        serviceName: 'Fraud Detection Service',
        route: '/api/check',
        method: 'POST',
      },
    })

    const result = detectPerModuleConnections(
      project,
      [useCase, httpCall],
      {
        repository: 'test-repo',
        moduleGlobs: ['/src/orders/**/*.ts'],
        allComponents: [useCase, httpCall],
        patterns: [
          {
            name: 'same-http-call-edge',
            find: 'methodCalls',
            where: { methodName: 'Check' },
            linkType: 'sync',
          },
        ],
      },
      matchesGlob,
    )

    expect(result.links).toStrictEqual([])
    expect(result.externalLinks).toStrictEqual([
      expect.objectContaining({
        source: 'orders:useCase:PlaceOrder',
        target: {
          name: 'Fraud Detection Service',
          route: '/api/check',
        },
        type: 'sync',
      }),
    ])
  })
})
