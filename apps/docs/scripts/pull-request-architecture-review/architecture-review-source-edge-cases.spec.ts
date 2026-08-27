import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { inspectArchitecture } from './architecture-review-source'

const temporaryWorkspaces: string[] = []

afterEach(() => {
  for (const workspace of temporaryWorkspaces.splice(0)) {
    rmSync(workspace, { force: true, recursive: true })
  }
})

describe('architecture source edge cases', () => {
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

function createWorkspace(): string {
  const workspace = mkdtempSync(path.join(tmpdir(), 'architecture-review-'))
  temporaryWorkspaces.push(workspace)
  return workspace
}

function writeWorkspaceFile(workspace: string, relativePath: string, source: string): void {
  const filePath = path.join(workspace, relativePath)
  mkdirSync(path.dirname(filePath), { recursive: true })
  writeFileSync(filePath, source)
}
