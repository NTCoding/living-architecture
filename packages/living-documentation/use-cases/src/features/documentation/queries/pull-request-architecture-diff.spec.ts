import { afterEach, describe, expect, it } from 'vitest'
import { ArchitectureSourceLoader } from '../data-access/architecture-source/architecture-source-loader'
import { TypescriptWorkspaceReadError } from '../../../infra/external-clients/typescript/typescript-architecture-model'
import { TypescriptWorkspaceReader } from '../../../infra/external-clients/typescript/typescript-workspace-reader'
import {
  createWorkspace,
  removeTemporaryWorkspaces,
  writeWorkspaceFile,
} from '../../../infra/external-clients/typescript/__fixtures__/typescript-test-workspace'
import { GeneratePullRequestArchitectureDiff } from './generate-pr-architecture-diff'

afterEach(removeTemporaryWorkspaces)

describe('pull request architecture review', () => {
  it('renders only added and removed metadata in the agreed hierarchy', () => {
    const base = createBaseWorkspace()
    const head = createHeadWorkspace()

    const report = generateArchitectureReview(base, head)

    expect(report).toBe(expectedArchitectureReview())
  })

  it('returns a minimal comment when the architecture metadata is unchanged', () => {
    const workspace = createBaseWorkspace()

    const report = generateArchitectureReview(workspace, workspace)

    expect(report).toBe(`<!-- pull-request-architecture-review -->
# Pull request architecture changes

No architecture changes detected.
`)
  })

  it('fails when an entrypoint cannot be assigned to one subdomain', () => {
    const workspace = createWorkspace()
    writeSubdomainManifest(workspace, 'orders')
    writeSubdomainManifest(workspace, 'shipping')
    writeWorkspaceFile(
      workspace,
      'apps/cli/src/features/combined/entrypoint/entrypoint.ts',
      `
        import type { PlaceOrder } from '@example/orders-use-cases/place-order'
        import type { ShipOrder } from '@example/shipping-use-cases/ship-order'

        /** @riviere-role cli-entrypoint */
        export function createCombinedCommand(
          place: PlaceOrder,
          ship: ShipOrder,
        ): void {}
      `,
    )

    expect(() => inspectArchitecture(workspace)).toThrow(
      new TypescriptWorkspaceReadError(
        "Cannot determine one subdomain for entrypoint declaration 'createCombinedCommand'.",
      ),
    )
  })

  it('assigns aggregate entities only within their package', () => {
    const workspace = createWorkspace()
    writePackageManifest(workspace, 'packages/orders/domain-model/package.json', {
      name: '@example/orders-domain-model',
    })
    writePackageManifest(workspace, 'packages/orders/published-language/package.json', {
      name: '@example/orders-published-language',
    })
    writeWorkspaceFile(
      workspace,
      'packages/orders/domain-model/src/shared-aggregate.ts',
      `
        /** @riviere-role aggregate-entity */
        export class DomainEntity {}

        /** @riviere-role aggregate */
        export class SharedAggregate {
          constructor(private readonly entity: DomainEntity) {}
        }
      `,
    )
    writeWorkspaceFile(
      workspace,
      'packages/orders/published-language/src/shared-aggregate.ts',
      `
        /** @riviere-role aggregate-entity */
        export class PublishedEntity {}

        /** @riviere-role aggregate */
        export class SharedAggregate {
          constructor(private readonly entity: PublishedEntity) {}
        }
      `,
    )

    const aggregates = inspectArchitecture(workspace).subdomains[0]?.layers.domain.aggregates

    expect(aggregates).toStrictEqual([
      {
        entities: [{ name: 'DomainEntity', packageKind: 'domain-model', role: 'aggregate-entity' }],
        methods: [],
        name: 'SharedAggregate',
        packageKind: 'domain-model',
      },
      {
        entities: [
          {
            name: 'PublishedEntity',
            packageKind: 'published-language',
            role: 'aggregate-entity',
          },
        ],
        methods: [],
        name: 'SharedAggregate',
        packageKind: 'published-language',
      },
    ])
  })
})

function inspectArchitecture(workspaceRoot: string) {
  return new TypescriptWorkspaceReader().readArchitectureSnapshot(workspaceRoot)
}

function generateArchitectureReview(baseWorkspaceRoot: string, headWorkspaceRoot: string): string {
  return new GeneratePullRequestArchitectureDiff(
    new ArchitectureSourceLoader(new TypescriptWorkspaceReader()),
  ).execute({ baseWorkspaceRoot, headWorkspaceRoot, outputPath: 'output.md' }).markdown
}

function createBaseWorkspace(): string {
  const workspace = createWorkspace()
  writeSubdomainManifest(workspace, 'orders')
  writeWorkspaceFile(
    workspace,
    'packages/orders/domain-model/src/order.ts',
    `
      import { OrderLine } from './order-line'

      /** @riviere-role aggregate */
      export class Order {
        private constructor(private readonly lines: readonly OrderLine[]) {}
        static open(): Order { return new Order([]) }
        place(): void {}
        cancel(): void {}
        private hide(): void {}
      }

      /** @riviere-role aggregate */
      export class LegacyOrder { archive(): void {} }

      /** @riviere-role domain-service */
      export function oldOrderPolicy(): void {}
    `,
  )
  writeWorkspaceFile(
    workspace,
    'packages/orders/domain-model/src/order-line.ts',
    `
      /** @riviere-role aggregate-entity */
      export class OrderLine {}
    `,
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
    'apps/cli/src/features/orders/entrypoint/place/entrypoint.ts',
    `
      import type { PlaceOrder } from '@example/orders-use-cases/place-order'

      /** @riviere-role cli-entrypoint-dependencies */
      export interface PlaceOrderDependencies { readonly placeOrder: PlaceOrder }

      /** @riviere-role cli-entrypoint */
      export function createPlaceOrderCommand(_: PlaceOrderDependencies): void {}
    `,
  )
  return workspace
}

function createHeadWorkspace(): string {
  const workspace = createWorkspace()
  writeSubdomainManifest(workspace, 'orders')
  writePackageManifest(workspace, 'packages/orders/published-language/package.json', {
    name: '@example/orders-published-language',
  })
  writeWorkspaceFile(
    workspace,
    'packages/orders/domain-model/src/order.ts',
    `
      import { OrderLine } from './order-line'
      import { Shipment as Delivery } from './shipment'

      /** @riviere-role aggregate */
      export class Order {
        private constructor(
          private readonly lines: readonly OrderLine[],
          private readonly shipment: Delivery,
        ) {}
        static open(): Order { return new Order([], new Delivery()) }
        place(): void {}
        fulfil(): void {}
      }

      /** @riviere-role aggregate */
      export class NewOrder { start(): void {} }

      /** @riviere-role value-object */
      export type OrderPolicy = string

      /** @riviere-role domain-service */
      export const newOrderPolicy = (): void => {}
    `,
  )
  writeWorkspaceFile(
    workspace,
    'packages/orders/domain-model/src/order-line.ts',
    `
      /** @riviere-role aggregate-entity */
      export class OrderLine {}
    `,
  )
  writeWorkspaceFile(
    workspace,
    'packages/orders/domain-model/src/shipment.ts',
    `
      /** @riviere-role aggregate-entity */
      export class Shipment {}
    `,
  )
  writeWorkspaceFile(
    workspace,
    'packages/orders/published-language/src/legacy-order.ts',
    `
      /** @riviere-role value-object */
      export class LegacyOrder {}
    `,
  )
  writeWorkspaceFile(
    workspace,
    'packages/orders/use-cases/src/fulfil-order.ts',
    `
      /** @riviere-role command-use-case */
      export class FulfilOrder {}
    `,
  )
  writeWorkspaceFile(
    workspace,
    'apps/cli/src/features/orders/entrypoint/fulfil/entrypoint.ts',
    `
      import type { FulfilOrder } from '@example/orders-use-cases/fulfil-order'

      /** @riviere-role cli-entrypoint-dependencies */
      export interface FulfilOrderDependencies { readonly fulfilOrder: FulfilOrder }

      /** @riviere-role cli-entrypoint */
      export function createFulfilOrderCommand(_: FulfilOrderDependencies): void {}
    `,
  )
  return workspace
}

function expectedArchitectureReview(): string {
  return `<!-- pull-request-architecture-review -->
# Pull request architecture changes

## Changed subdomains

- [\`orders\`](#subdomain-orders)

## Subdomain: \`orders\`

### Entry points

#### Added

| Name | Role |
| --- | --- |
| \`createFulfilOrderCommand\` | \`cli-entrypoint\` |
| \`FulfilOrderDependencies\` | \`cli-entrypoint-dependencies\` |

#### Removed

| Name | Role |
| --- | --- |
| \`createPlaceOrderCommand\` | \`cli-entrypoint\` |
| \`PlaceOrderDependencies\` | \`cli-entrypoint-dependencies\` |

### Use cases

#### Added

| Name | Role |
| --- | --- |
| \`FulfilOrder\` | \`command-use-case\` |

#### Removed

| Name | Role |
| --- | --- |
| \`PlaceOrder\` | \`command-use-case\` |

### Domain

#### Added

##### Aggregate: \`NewOrder\` (\`domain-model\`)

- Methods
    - \`start\`

##### Aggregate: \`Order\` (\`domain-model\`)

- Aggregate entities
    - \`Shipment\`
- Methods
    - \`fulfil\`

| Name | Role | Package |
| --- | --- | --- |
| \`LegacyOrder\` | \`value-object\` | \`published-language\` |
| \`newOrderPolicy\` | \`domain-service\` | \`domain-model\` |
| \`OrderPolicy\` | \`value-object\` | \`domain-model\` |

#### Removed

##### Aggregate: \`LegacyOrder\` (\`domain-model\`)

- Methods
    - \`archive\`

##### Aggregate: \`Order\` (\`domain-model\`)

- Methods
    - \`cancel\`

| Name | Role | Package |
| --- | --- | --- |
| \`oldOrderPolicy\` | \`domain-service\` | \`domain-model\` |
`
}

function writeSubdomainManifest(workspace: string, subdomain: string): void {
  writePackageManifest(workspace, `packages/${subdomain}/domain-model/package.json`, {
    name: `@example/${subdomain}-domain-model`,
  })
  writePackageManifest(workspace, `packages/${subdomain}/use-cases/package.json`, {
    name: `@example/${subdomain}-use-cases`,
  })
}

function writePackageManifest(
  workspace: string,
  relativePath: string,
  manifest: Readonly<Record<string, unknown>>,
): void {
  writeWorkspaceFile(workspace, relativePath, JSON.stringify(manifest))
}
