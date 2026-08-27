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
