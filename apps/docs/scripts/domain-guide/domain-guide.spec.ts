import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { renderDomainGuide } from './domain-guide-markdown'
import { inspectSubdomains } from './domain-guide-source'

const temporaryWorkspaces: string[] = []

function createWorkspace(): string {
  const workspace = mkdtempSync(path.join(tmpdir(), 'domain-guide-'))
  temporaryWorkspaces.push(workspace)
  return workspace
}

function writeWorkspaceFile(workspace: string, relativePath: string, source: string): void {
  const filePath = path.join(workspace, relativePath)
  mkdirSync(path.dirname(filePath), { recursive: true })
  writeFileSync(filePath, source)
}

function writePackageManifest(
  workspace: string,
  relativePath: string,
  manifest: Readonly<Record<string, unknown>>,
): void {
  writeWorkspaceFile(workspace, relativePath, JSON.stringify(manifest))
}

function createExampleWorkspace(): string {
  const workspace = createWorkspace()
  writePackageManifest(workspace, 'packages/orders/domain-model/package.json', {
    description: 'Models the order lifecycle.',
    name: '@example/orders-domain-model',
  })
  writeWorkspaceFile(
    workspace,
    'packages/orders/domain-model/src/order.ts',
    `
      /** @riviere-role aggregate */
      export class Order {
        static open(): Order { return new Order() }
        confirm(): void {}
        cancel(): void {}
        private hide(): void {}
      }

      /**
 * @riviere-role domain-service
 * @riviere-role-justification PLACEHOLDER: Added before justification rule introduced.
 */
      export class OrderPolicy {
        approve(): void {}
      }
    `,
  )
  writePackageManifest(workspace, 'packages/orders/use-cases/package.json', {
    name: '@example/orders-use-cases',
  })
  writeWorkspaceFile(
    workspace,
    'packages/orders/use-cases/src/order-repository.ts',
    `
      import { Order } from '@example/orders-domain-model/order'

      /** @riviere-role aggregate-repository */
      export class OrderRepository {
        load(): Order { throw new Error() }
      }
    `,
  )
  writeWorkspaceFile(
    workspace,
    'packages/orders/use-cases/src/confirm-order.ts',
    `
      import type { Order } from '@example/orders-domain-model/order'
      import type { OrderPolicy } from '@example/orders-domain-model/order'
      import { OrderRepository } from './order-repository'

      /** @riviere-role command-use-case */
      export class ConfirmOrder {
        constructor(
          private readonly repository: OrderRepository,
          private readonly policy: OrderPolicy,
        ) {}

        execute(): void {
          const order = this.repository.load()
          this.policy.approve()
          confirm(order)
        }
      }

      function confirm(order: Order): void {
        order.confirm()
      }
    `,
  )
  writeWorkspaceFile(
    workspace,
    'packages/orders/use-cases/src/list-orders.ts',
    `
      /** @riviere-role query-model-use-case */
      export class ListOrders {}
    `,
  )
  writeWorkspaceFile(
    workspace,
    'packages/orders/use-cases/src/ignored.spec.ts',
    `
      /** @riviere-role command-use-case */
      export class FalseCommand {}
    `,
  )
  writeWorkspaceFile(
    workspace,
    'packages/orders/use-cases/src/__fixtures__/embedded.ts',
    `
      /** @riviere-role command-use-case */
      export class FixtureCommand {}
    `,
  )
  writeWorkspaceFile(
    workspace,
    'apps/cli/src/orders.ts',
    `
      import type { ConfirmOrder } from '@example/orders-use-cases/confirm-order'
      export type Command = ConfirmOrder
    `,
  )
  writePackageManifest(workspace, 'packages/catalogue/domain-model/package.json', {
    description: 'Models the product catalogue.',
    name: '@example/catalogue-domain-model',
  })
  writeWorkspaceFile(workspace, 'packages/catalogue/domain-model/src/index.ts', 'export {}')
  writePackageManifest(workspace, 'packages/messages/published-language/package.json', {
    description: 'Defines the public message language.',
    name: '@example/messages-published-language',
  })
  writeWorkspaceFile(
    workspace,
    'packages/messages/published-language/src/index.ts',
    'export interface Message {}',
  )
  return workspace
}

afterEach(() => {
  for (const workspace of temporaryWorkspaces.splice(0)) {
    rmSync(workspace, { force: true, recursive: true })
  }
})

describe('domain guide', () => {
  it('renders navigation for discovered subdomains', () => {
    const guide = renderDomainGuide(inspectSubdomains(createExampleWorkspace()))

    expect(guide).toContain('## Contents')
    expect(guide).toContain('  - [`orders`](#orders)')
    expect(guide).toContain('  - [`messages`](#messages)')
    expect(guide).toContain('## Subdomain overview')
  })

  it('summarises domain package kinds and use case counts', () => {
    const guide = renderDomainGuide(inspectSubdomains(createExampleWorkspace()))

    expect(guide).toContain(
      '| Domain packages | Aggregates | Command use cases | Query use cases | CLI use cases |',
    )
    expect(guide).toContain(
      '| [`orders`](#orders) | Models the order lifecycle. | domain model: `@example/orders-domain-model` | `Order` | 1 | 1 | 1 |',
    )
    expect(guide).toContain(
      '| [`messages`](#messages) | Defines the public message language. | published language: `@example/messages-published-language` | _None declared_ | 0 | 0 | 0 |',
    )
  })

  it('represents a published language only subdomain without inventing aggregates', () => {
    const guide = renderDomainGuide(inspectSubdomains(createExampleWorkspace()))

    expect(guide).toContain('### `messages`')
    expect(guide).toContain('Published language package: `@example/messages-published-language`')
    expect(guide).toContain('_This subdomain currently exposes published language only._')
  })

  it('renders aggregates and supported use cases', () => {
    const guide = renderDomainGuide(inspectSubdomains(createExampleWorkspace()))

    expect(guide).toContain('Models the order lifecycle.')
    expect(guide).toContain('- `Order`\n  - `open`\n  - `confirm`\n  - `cancel`')
    expect(guide).toContain('- `ConfirmOrder`')
    expect(guide).toContain('- `ListOrders`')
  })

  it('connects use cases to domain operations and CLI exposure', () => {
    const guide = renderDomainGuide(inspectSubdomains(createExampleWorkspace()))

    expect(guide).toContain('Invokes domain service operation `OrderPolicy.approve`')
    expect(guide).toContain('Invokes aggregate operation `Order.confirm`')
    expect(guide).toContain('#### CLI use cases\n\n- `ConfirmOrder`')
  })

  it('ignores test fixtures and private aggregate methods', () => {
    const guide = renderDomainGuide(inspectSubdomains(createExampleWorkspace()))

    expect(guide).not.toContain('FalseCommand')
    expect(guide).not.toContain('FixtureCommand')
    expect(guide).not.toContain('`hide`')
  })

  it('rejects a domain model package without a description', () => {
    const workspace = createWorkspace()
    writePackageManifest(workspace, 'packages/orders/domain-model/package.json', {
      name: '@example/orders-domain-model',
    })

    expect(() => inspectSubdomains(workspace)).toThrow(
      "must define a non-empty string 'description' in package.json",
    )
  })
})
