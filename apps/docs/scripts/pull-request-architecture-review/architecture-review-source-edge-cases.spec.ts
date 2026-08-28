import { afterEach, describe, expect, it } from 'vitest'
import { inspectArchitecture } from './architecture-review-source'
import {
  createWorkspace,
  removeTemporaryWorkspaces,
  writeWorkspaceFile,
} from './architecture-review-test-workspace'

afterEach(removeTemporaryWorkspaces)

describe('architecture source edge cases', () => {
  it('excludes fixture directories at the package root', () => {
    const workspace = createWorkspace()
    for (const fixtureDirectory of ['fixtures', '__fixtures__']) {
      writeWorkspaceFile(
        workspace,
        `packages/${fixtureDirectory}/domain-model/package.json`,
        JSON.stringify({ name: `@example/${fixtureDirectory}-domain-model` }),
      )
      writeWorkspaceFile(
        workspace,
        `packages/${fixtureDirectory}/domain-model/src/example.ts`,
        `
          /** @riviere-role aggregate */
          export class FixtureAggregate {}
        `,
      )
    }

    expect(inspectArchitecture(workspace).subdomains).toStrictEqual([])
  })

  it('discovers production declarations in mts and cts files', () => {
    const workspace = createWorkspace()
    writeWorkspaceFile(
      workspace,
      'packages/orders/domain-model/package.json',
      JSON.stringify({ name: '@example/orders-domain-model' }),
    )
    writeWorkspaceFile(
      workspace,
      'packages/orders/domain-model/src/order-id.mts',
      `
        /** @riviere-role value-object */
        export type OrderId = string
      `,
    )
    writeWorkspaceFile(
      workspace,
      'packages/orders/domain-model/src/order-status.cts',
      `
        /** @riviere-role value-object */
        export type OrderStatus = string
      `,
    )

    const items = inspectArchitecture(workspace).subdomains[0]?.layers.domain.items

    expect(items).toStrictEqual([
      { name: 'OrderId', packageKind: 'domain-model', role: 'value-object' },
      { name: 'OrderStatus', packageKind: 'domain-model', role: 'value-object' },
    ])
  })

  it('excludes entrypoints nested inside fixture directories', () => {
    const workspace = createWorkspace()
    writeWorkspaceFile(
      workspace,
      'packages/orders/use-cases/package.json',
      JSON.stringify({ name: '@example/orders-use-cases' }),
    )
    writeWorkspaceFile(
      workspace,
      'packages/orders/use-cases/src/place-order.ts',
      `
        /** @riviere-role command-use-case */
        export class PlaceOrder {}
      `,
    )
    writeWorkspaceFile(
      workspace,
      'apps/cli/src/__fixtures__/entrypoint/entrypoint.ts',
      `
        import type { PlaceOrder } from '@example/orders-use-cases/place-order'

        /** @riviere-role cli-entrypoint */
        export function createFixtureCommand(_: PlaceOrder): void {}
      `,
    )

    const entrypoints = inspectArchitecture(workspace).subdomains[0]?.layers.entrypoints.items

    expect(entrypoints).toStrictEqual([])
  })

  it('excludes ECMAScript private methods from aggregate methods', () => {
    const workspace = createWorkspace()
    writeWorkspaceFile(
      workspace,
      'packages/orders/domain-model/package.json',
      JSON.stringify({ name: '@example/orders-domain-model' }),
    )
    writeWorkspaceFile(
      workspace,
      'packages/orders/domain-model/src/order.ts',
      `
        /** @riviere-role aggregate */
        export class Order {
          place(): void {}
          #recordAudit(): void {}
        }
      `,
    )

    const aggregates = inspectArchitecture(workspace).subdomains[0]?.layers.domain.aggregates

    expect(aggregates).toStrictEqual([
      {
        entities: [],
        methods: ['place'],
        name: 'Order',
        packageKind: 'domain-model',
      },
    ])
  })
})
