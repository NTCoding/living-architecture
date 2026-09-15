import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { enforce } from './__fixtures__/role-enforcement-plugin-fixture'

it('rejects a domain port that no adapter implements', () => {
  const workspaceDir = mkdtempSync(join(tmpdir(), 'role-enforcement-plugin-'))
  const entrypointDir = join(workspaceDir, 'packages/example/src/entrypoint')
  const portPath = join(entrypointDir, 'payment-port.ts')
  const portSource = `/** @riviere-role domain-port */
export interface PaymentAuthorizer {
  authorize(): void
}
`

  try {
    mkdirSync(entrypointDir, { recursive: true })
    writeFileSync(portPath, portSource, { encoding: 'utf8', flag: 'w' })

    const messages = enforce(portSource, { configDir: workspaceDir, filename: portPath })

    expect(messages).toHaveLength(1)
    expect(messages[0]?.message).toContain(
      "Role 'domain-port' must be implemented by at least one 'domain-port-adapter' declaration.",
    )
  } finally {
    rmSync(workspaceDir, { force: true, recursive: true })
  }
})

it('allows a domain port implemented by an adapter in the workspace', () => {
  const workspaceDir = mkdtempSync(join(tmpdir(), 'role-enforcement-plugin-'))
  const entrypointDir = join(workspaceDir, 'packages/example/src/entrypoint')
  const portPath = join(entrypointDir, 'payment-port.ts')
  const adapterPath = join(entrypointDir, 'payment-adapter.ts')
  const portSource = `/** @riviere-role domain-port */
export interface PaymentAuthorizer {
  authorize(): void
}
`

  try {
    mkdirSync(entrypointDir, { recursive: true })
    writeFileSync(portPath, portSource, { encoding: 'utf8', flag: 'w' })
    writeFileSync(
      adapterPath,
      `import type { PaymentAuthorizer } from './payment-port'

/** @riviere-role domain-port-adapter */
export function createPaymentAuthorizer(): PaymentAuthorizer {
  return { authorize() {} }
}
`,
      { encoding: 'utf8', flag: 'w' },
    )

    const messages = enforce(portSource, { configDir: workspaceDir, filename: portPath })

    expect(messages).toStrictEqual([])
  } finally {
    rmSync(workspaceDir, { force: true, recursive: true })
  }
})

it('allows a domain port implemented by an adapter through a barrel re-export', () => {
  const workspaceDir = mkdtempSync(join(tmpdir(), 'role-enforcement-plugin-'))
  const entrypointDir = join(workspaceDir, 'packages/example/src/entrypoint')
  const portPath = join(entrypointDir, 'payment-port.ts')
  const barrelPath = join(entrypointDir, 'index.ts')
  const adapterPath = join(entrypointDir, 'payment-adapter.ts')
  const portSource = `/** @riviere-role domain-port */
export interface PaymentAuthorizer {
  authorize(): void
}
`

  try {
    mkdirSync(entrypointDir, { recursive: true })
    writeFileSync(portPath, portSource, { encoding: 'utf8', flag: 'w' })
    writeFileSync(
      barrelPath,
      `export type { PaymentAuthorizer } from './payment-port'\n`,
      { encoding: 'utf8', flag: 'w' },
    )
    writeFileSync(
      adapterPath,
      `import type { PaymentAuthorizer } from './index'

/** @riviere-role domain-port-adapter */
export function createPaymentAuthorizer(): PaymentAuthorizer {
  return { authorize() {} }
}
`,
      { encoding: 'utf8', flag: 'w' },
    )

    const messages = enforce(portSource, { configDir: workspaceDir, filename: portPath })

    expect(messages).toStrictEqual([])
  } finally {
    rmSync(workspaceDir, { force: true, recursive: true })
  }
})
