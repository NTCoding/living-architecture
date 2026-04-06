import {
  mkdtempSync, mkdirSync, rmSync, writeFileSync 
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  expect, it 
} from 'vitest'
import {
  location, role, roleEnforcement 
} from '../../../domain/role-enforcement-builder'
import { runRoleEnforcement } from './run-role-enforcement'

const workspacePackageTestRoles = [
  role('aggregate', {
    targets: ['class'],
    minPublicMethods: 1,
  }),
  role('aggregate-repository', {
    targets: ['class'],
    allowedOutputs: ['aggregate'],
  }),
] as const

const workspacePackageConfig = roleEnforcement({
  packages: ['packages/my-app'],
  canonicalConfigurationsFile: '.riviere/canonical-role-configurations.md',
  ignorePatterns: [],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: workspacePackageTestRoles,
  workspacePackageSources: { '@my-org/my-lib': 'packages/my-lib/src/index.ts' },
  locations: [
    location<(typeof workspacePackageTestRoles)[number]['name']>('src').subLocation(
      '/repositories',
      ['aggregate-repository'],
    ),
  ],
})

function createWorkspacePackageFixture(): string {
  const workspaceDir = mkdtempSync(path.join(tmpdir(), 'role-enforcement-pkg-'))
  const appDir = path.join(workspaceDir, 'packages', 'my-app')
  const libDir = path.join(workspaceDir, 'packages', 'my-lib')

  mkdirSync(path.join(appDir, 'src', 'repositories'), { recursive: true })
  mkdirSync(path.join(libDir, 'src'), { recursive: true })
  mkdirSync(path.join(workspaceDir, '.riviere', 'role-definitions'), { recursive: true })

  writeFileSync(
    path.join(libDir, 'src', 'order.ts'),
    `/** @riviere-role aggregate */
export class Order {
  cancel(): void {}
}
`,
  )
  writeFileSync(
    path.join(libDir, 'src', 'index.ts'),
    `export * from './order'
`,
  )
  writeFileSync(
    path.join(appDir, 'src', 'repositories', 'orderRepository.ts'),
    `import type { Order } from '@my-org/my-lib'

/** @riviere-role aggregate-repository */
export class OrderRepository {
  findById(id: string): Order {
    return null as unknown as Order
  }
}
`,
  )

  writeFileSync(
    path.join(workspaceDir, '.riviere', 'canonical-role-configurations.md'),
    '# Canonical Role Configurations',
  )
  const roleDefsDir = path.join(workspaceDir, '.riviere', 'role-definitions')
  for (const r of workspacePackageTestRoles) {
    writeFileSync(path.join(roleDefsDir, `${r.name}.md`), `# ${r.name}`)
  }

  return workspaceDir
}

it('accepts aggregate-repository returning aggregate from workspace package via barrel export', () => {
  const workspaceDir = createWorkspacePackageFixture()

  const result = runRoleEnforcement(workspacePackageConfig, workspaceDir)

  expect(result.exitCode).toBe(0)
  expect(result.stderr).toBe('')

  rmSync(workspaceDir, {
    force: true,
    recursive: true,
  })
})

it('rejects aggregate-repository returning unannotated class from workspace package', () => {
  const workspaceDir = createWorkspacePackageFixture()

  writeFileSync(
    path.join(workspaceDir, 'packages', 'my-lib', 'src', 'order.ts'),
    `export class Order {
  cancel(): void {}
}
`,
  )

  const result = runRoleEnforcement(workspacePackageConfig, workspaceDir)

  expect(result.exitCode).toBe(1)
  expect(result.stdout).toContain('only allows outputs [aggregate]')

  rmSync(workspaceDir, {
    force: true,
    recursive: true,
  })
})
