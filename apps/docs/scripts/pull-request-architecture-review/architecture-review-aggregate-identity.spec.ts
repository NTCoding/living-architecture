import { afterEach, describe, expect, it } from 'vitest'
import { inspectArchitecture } from './architecture-review-source'
import {
  createWorkspace,
  removeTemporaryWorkspaces,
  writeWorkspaceFile,
} from './architecture-review-test-workspace'

afterEach(removeTemporaryWorkspaces)

describe('aggregate entity source identity', () => {
  it('distinguishes same-named aggregate entities by source module', () => {
    const workspace = createWorkspace()
    writeWorkspaceFile(
      workspace,
      'packages/orders/domain-model/package.json',
      JSON.stringify({ name: '@example/orders-domain-model' }),
    )
    writeWorkspaceFile(
      workspace,
      'packages/orders/domain-model/src/first-line.ts',
      `
        /** @riviere-role aggregate-entity */
        export class Line {}
      `,
    )
    writeWorkspaceFile(
      workspace,
      'packages/orders/domain-model/src/second-line.ts',
      `
        /** @riviere-role aggregate-entity */
        export class Line {}
      `,
    )
    writeWorkspaceFile(
      workspace,
      'packages/orders/domain-model/src/first-order.ts',
      `
        import { Line as FirstLine } from './first-line'

        /** @riviere-role aggregate */
        export class FirstOrder {
          constructor(private readonly line: FirstLine) {}
        }
      `,
    )
    writeWorkspaceFile(
      workspace,
      'packages/orders/domain-model/src/second-order.ts',
      `
        import { Line as SecondLine } from './second-line'

        /** @riviere-role aggregate */
        export class SecondOrder {
          constructor(private readonly line: SecondLine) {}
        }
      `,
    )

    const aggregates = inspectArchitecture(workspace).subdomains[0]?.layers.domain.aggregates

    expect(aggregates).toStrictEqual([
      {
        entities: [{ name: 'Line', packageKind: 'domain-model', role: 'aggregate-entity' }],
        methods: [],
        name: 'FirstOrder',
        packageKind: 'domain-model',
      },
      {
        entities: [{ name: 'Line', packageKind: 'domain-model', role: 'aggregate-entity' }],
        methods: [],
        name: 'SecondOrder',
        packageKind: 'domain-model',
      },
    ])
  })

  it('matches a default-imported aggregate entity to its source module', () => {
    const workspace = createWorkspace()
    writeWorkspaceFile(
      workspace,
      'packages/orders/domain-model/package.json',
      JSON.stringify({ name: '@example/orders-domain-model' }),
    )
    writeWorkspaceFile(
      workspace,
      'packages/orders/domain-model/src/line.ts',
      `
        /** @riviere-role aggregate-entity */
        export default class Line {}
      `,
    )
    writeWorkspaceFile(
      workspace,
      'packages/orders/domain-model/src/order.ts',
      `
        import OrderLine from './line'

        /** @riviere-role aggregate */
        export class Order {
          constructor(private readonly line: OrderLine) {}
        }
      `,
    )

    const aggregates = inspectArchitecture(workspace).subdomains[0]?.layers.domain.aggregates

    expect(aggregates).toStrictEqual([
      {
        entities: [{ name: 'Line', packageKind: 'domain-model', role: 'aggregate-entity' }],
        methods: [],
        name: 'Order',
        packageKind: 'domain-model',
      },
    ])
  })

  it('keeps ownership separate for same-named aggregates in different source modules', () => {
    const workspace = createWorkspace()
    writeWorkspaceFile(
      workspace,
      'packages/orders/domain-model/package.json',
      JSON.stringify({ name: '@example/orders-domain-model' }),
    )
    writeWorkspaceFile(
      workspace,
      'packages/orders/domain-model/src/first-line.ts',
      `
        /** @riviere-role aggregate-entity */
        export class FirstLine {}
      `,
    )
    writeWorkspaceFile(
      workspace,
      'packages/orders/domain-model/src/second-line.ts',
      `
        /** @riviere-role aggregate-entity */
        export class SecondLine {}
      `,
    )
    writeWorkspaceFile(
      workspace,
      'packages/orders/domain-model/src/first-order.ts',
      `
        import { FirstLine } from './first-line'

        /** @riviere-role aggregate */
        export class Order {
          constructor(private readonly line: FirstLine) {}
        }
      `,
    )
    writeWorkspaceFile(
      workspace,
      'packages/orders/domain-model/src/second-order.ts',
      `
        import { SecondLine } from './second-line'

        /** @riviere-role aggregate */
        export class Order {
          constructor(private readonly line: SecondLine) {}
        }
      `,
    )

    const aggregates = inspectArchitecture(workspace).subdomains[0]?.layers.domain.aggregates

    expect(aggregates).toStrictEqual([
      {
        entities: [{ name: 'FirstLine', packageKind: 'domain-model', role: 'aggregate-entity' }],
        methods: [],
        name: 'Order',
        packageKind: 'domain-model',
      },
      {
        entities: [{ name: 'SecondLine', packageKind: 'domain-model', role: 'aggregate-entity' }],
        methods: [],
        name: 'Order',
        packageKind: 'domain-model',
      },
    ])
  })

  it('matches a namespace-imported aggregate entity to its source module', () => {
    const workspace = createWorkspace()
    writeWorkspaceFile(
      workspace,
      'packages/orders/domain-model/package.json',
      JSON.stringify({ name: '@example/orders-domain-model' }),
    )
    writeWorkspaceFile(
      workspace,
      'packages/orders/domain-model/src/line.ts',
      `
        /** @riviere-role aggregate-entity */
        export class Line {}
      `,
    )
    writeWorkspaceFile(
      workspace,
      'packages/orders/domain-model/src/order.ts',
      `
        import type * as entities from './line'

        /** @riviere-role aggregate */
        export class Order {
          constructor(private readonly line: entities.Line) {}
        }
      `,
    )

    const aggregates = inspectArchitecture(workspace).subdomains[0]?.layers.domain.aggregates

    expect(aggregates).toStrictEqual([
      {
        entities: [{ name: 'Line', packageKind: 'domain-model', role: 'aggregate-entity' }],
        methods: [],
        name: 'Order',
        packageKind: 'domain-model',
      },
    ])
  })
})
