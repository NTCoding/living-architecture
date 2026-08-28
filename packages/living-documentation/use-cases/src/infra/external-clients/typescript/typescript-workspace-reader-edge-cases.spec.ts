import { afterEach, describe, expect, it } from 'vitest'
import { TypescriptWorkspaceReader } from './typescript-workspace-reader'
import {
  createWorkspace,
  removeTemporaryWorkspaces,
  writeWorkspaceFile,
} from './__fixtures__/typescript-test-workspace'

const inspectArchitecture = (workspaceRoot: string) =>
  new TypescriptWorkspaceReader().readArchitectureSnapshot(workspaceRoot)

afterEach(removeTemporaryWorkspaces)

describe('architecture source edge cases', () => {
  it('returns no subdomains when the workspace has no packages directory', () => {
    const workspace = createWorkspace()
    writeWorkspaceFile(
      workspace,
      'tools/empty/src/entrypoint/empty.ts',
      'export const empty = true',
    )

    expect(inspectArchitecture(workspace)).toStrictEqual({ subdomains: [] })
  })

  it('sorts discovered subdomains and ignores non-package entries', () => {
    const workspace = createWorkspace()
    writeWorkspaceFile(workspace, 'packages/readme.txt', 'not a package')
    for (const subdomain of ['zebra', 'alpha']) {
      writeWorkspaceFile(
        workspace,
        `packages/${subdomain}/published-language/package.json`,
        JSON.stringify({ name: `@example/${subdomain}-published-language` }),
      )
      writeWorkspaceFile(
        workspace,
        `packages/${subdomain}/published-language/src/message.ts`,
        '/** @riviere-role event */ export interface Message {}',
      )
    }

    expect(inspectArchitecture(workspace).subdomains.map(({ name }) => name)).toStrictEqual([
      'alpha',
      'zebra',
    ])
  })

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

  it.each(['__tests__', 'test', 'tests'])('excludes entrypoints nested inside %s', (directory) => {
    const workspace = createWorkspace()
    writeWorkspaceFile(
      workspace,
      'packages/orders/use-cases/package.json',
      JSON.stringify({ name: '@example/orders-use-cases' }),
    )
    writeWorkspaceFile(
      workspace,
      'packages/orders/use-cases/src/place-order.ts',
      '/** @riviere-role command-use-case */ export class PlaceOrder {}',
    )
    writeWorkspaceFile(
      workspace,
      `apps/cli/src/${directory}/entrypoint/entrypoint.ts`,
      `
        import type { PlaceOrder } from '@example/orders-use-cases/place-order'

        /** @riviere-role cli-entrypoint */
        export function createTestCommand(_: PlaceOrder): void {}
      `,
    )

    expect(inspectArchitecture(workspace).subdomains[0]?.layers.entrypoints.items).toStrictEqual([])
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

  it('rejects an aggregate entity owned by two aggregates', () => {
    const workspace = createWorkspace()
    writeWorkspaceFile(
      workspace,
      'packages/orders/domain-model/package.json',
      JSON.stringify({ name: '@example/orders-domain-model' }),
    )
    writeWorkspaceFile(
      workspace,
      'packages/orders/domain-model/src/model.ts',
      `
        /** @riviere-role aggregate-entity */ export class Line {}
        /** @riviere-role aggregate */ export class FirstOrder { line: Line }
        /** @riviere-role aggregate */ export class SecondOrder { line: Line }
      `,
    )

    expect(() => inspectArchitecture(workspace)).toThrow(
      "Aggregate entity 'Line' is referenced as state by more than one aggregate.",
    )
  })

  it('keeps an unowned aggregate entity as a domain item', () => {
    const workspace = createWorkspace()
    writeWorkspaceFile(
      workspace,
      'packages/orders/domain-model/package.json',
      JSON.stringify({ name: '@example/orders-domain-model' }),
    )
    writeWorkspaceFile(
      workspace,
      'packages/orders/domain-model/src/line.ts',
      '/** @riviere-role aggregate-entity */ export class Line {}',
    )

    expect(inspectArchitecture(workspace).subdomains[0]?.layers.domain.items).toStrictEqual([
      { name: 'Line', packageKind: 'domain-model', role: 'aggregate-entity' },
    ])
  })

  it('uses imports across an entrypoint root to identify one owner', () => {
    const workspace = createWorkspace()
    writeWorkspaceFile(
      workspace,
      'packages/orders/use-cases/package.json',
      JSON.stringify({ name: '@example/orders-use-cases' }),
    )
    writeWorkspaceFile(
      workspace,
      'packages/orders/use-cases/src/place-order.ts',
      '/** @riviere-role command-use-case */ export class PlaceOrder {}',
    )
    writeWorkspaceFile(
      workspace,
      'tools/docs/src/features/orders/entrypoint/imports.ts',
      "import type { PlaceOrder } from '@example/orders-use-cases/place-order'",
    )
    writeWorkspaceFile(
      workspace,
      'tools/docs/src/features/orders/entrypoint/entrypoint.ts',
      '/** @riviere-role cli-entrypoint */ export function command(): void {}',
    )

    expect(inspectArchitecture(workspace).subdomains[0]?.layers.entrypoints.items).toStrictEqual([
      { name: 'command', packageKind: 'application', role: 'cli-entrypoint' },
    ])
  })

  it('rejects an entrypoint with no single subdomain owner', () => {
    const workspace = createWorkspace()
    for (const subdomain of ['orders', 'payments']) {
      writeWorkspaceFile(
        workspace,
        `packages/${subdomain}/use-cases/package.json`,
        JSON.stringify({ name: `@example/${subdomain}-use-cases` }),
      )
      writeWorkspaceFile(
        workspace,
        `packages/${subdomain}/use-cases/src/use-case.ts`,
        '/** @riviere-role command-use-case */ export class UseCase {}',
      )
    }
    writeWorkspaceFile(
      workspace,
      'apps/cli/src/entrypoint/entrypoint.ts',
      `
        import type { UseCase as Orders } from '@example/orders-use-cases'
        import type { UseCase as Payments } from '@example/payments-use-cases'
        /** @riviere-role cli-entrypoint */ export function command(_: Orders, __: Payments): void {}
      `,
    )

    expect(() => inspectArchitecture(workspace)).toThrow(
      "Cannot determine one subdomain for entrypoint declaration 'command'.",
    )
  })
})
