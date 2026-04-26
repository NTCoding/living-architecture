import {
  describe, it, expect 
} from 'vitest'
import { Project } from 'ts-morph'
import { extractComponents } from './extractor'
import { matchesGlob } from '../../../../platform/infra/external-clients/minimatch/minimatch-glob'
import { createConfigWithRule } from '../../../../test-fixtures'
import { GlobMatcher } from './glob-matcher'

function createTestProject() {
  return new Project({ useInMemoryFileSystem: true })
}

function extract(
  project: Project,
  paths: string[],
  config: ReturnType<typeof createConfigWithRule>,
  configDir?: string,
) {
  return extractComponents(project, paths, config, new GlobMatcher(matchesGlob), configDir)
}

describe('extractComponents — method extraction', () => {
  it('excludes private methods from extraction', () => {
    const project = createTestProject()
    project.createSourceFile(
      'orders/domain/order.ts',
      `
        function DomainOp() { return (target: any, key: string) => {} }
        class Order {
          @DomainOp
          public confirm() {}
          @DomainOp
          private checkCanConfirm() {}
          @DomainOp
          protected internalValidate() {}
        }
      `,
    )
    const config = createConfigWithRule('orders', 'orders/**', 'domainOp', {
      find: 'methods',
      where: { hasDecorator: { name: 'DomainOp' } },
    })
    const result = extract(project, ['orders/domain/order.ts'], config)
    expect(result).toMatchObject([
      {
        type: 'domainOp',
        name: 'confirm',
        location: {
          file: 'orders/domain/order.ts',
          line: 4,
        },
        domain: 'orders',
        module: 'orders-module',
      },
    ])
  })

  it('extracts methods without explicit access modifier (implicitly public)', () => {
    const project = createTestProject()
    project.createSourceFile(
      'orders/domain/order.ts',
      `
        function DomainOp() { return (target: any, key: string) => {} }
        class Order {
          @DomainOp
          confirm() {}
        }
      `,
    )
    const config = createConfigWithRule('orders', 'orders/**', 'domainOp', {
      find: 'methods',
      where: { hasDecorator: { name: 'DomainOp' } },
    })
    const result = extract(project, ['orders/domain/order.ts'], config)
    expect(result).toMatchObject([expect.objectContaining({ name: 'confirm' })])
  })

  it('extracts method as component when rule matches decorator', () => {
    const project = createTestProject()
    project.createSourceFile(
      'orders/api/controller.ts',
      `
        function API() { return (target: any, key: string) => {} }
        class OrderController {
          @API
          createOrder() {}
        }
      `,
    )
    const config = createConfigWithRule('orders', 'orders/**', 'api', {
      find: 'methods',
      where: { hasDecorator: { name: 'API' } },
    })
    const result = extract(project, ['orders/api/controller.ts'], config)
    expect(result).toMatchObject([
      {
        type: 'api',
        name: 'createOrder',
        location: {
          file: 'orders/api/controller.ts',
          line: 4,
        },
        domain: 'orders',
        module: 'orders-module',
      },
    ])
  })
})
