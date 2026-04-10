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
} from '../domain/role-enforcement-builder'
import { runRoleEnforcement } from './run-role-enforcement'

const workspacePackageTestRoles = [
  role('role-b', {
    targets: ['class'],
    minPublicMethods: 1,
  }),
  role('role-b-repository', {
    targets: ['class'],
    allowedOutputs: ['role-b'],
  }),
] as const

const workspacePackageConfig = roleEnforcement({
  packages: ['packages/pkg-a'],
  canonicalConfigurationsFile: '.riviere/canonical-role-configurations.md',
  ignorePatterns: [],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: workspacePackageTestRoles,
  workspacePackageSources: { '@generic/pkg-lib': 'packages/pkg-lib/src/index.ts' },
  locations: [
    location<(typeof workspacePackageTestRoles)[number]['name']>('src').subLocation(
      '/repositories',
      ['role-b-repository'],
    ),
  ],
})

function createWorkspacePackageFixture(): string {
  const workspaceDir = mkdtempSync(path.join(tmpdir(), 'role-enforcement-pkg-'))
  const appDir = path.join(workspaceDir, 'packages', 'pkg-a')
  const libDir = path.join(workspaceDir, 'packages', 'pkg-lib')

  mkdirSync(path.join(appDir, 'src', 'repositories'), { recursive: true })
  mkdirSync(path.join(libDir, 'src'), { recursive: true })
  mkdirSync(path.join(workspaceDir, '.riviere', 'role-definitions'), { recursive: true })

  writeFileSync(
    path.join(libDir, 'src', 'beta.ts'),
    `/** @riviere-role role-b */
export class Beta {
  cancel(): void {}
}
`,
  )
  writeFileSync(
    path.join(libDir, 'src', 'index.ts'),
    `export * from './beta'
`,
  )
  writeFileSync(
    path.join(appDir, 'src', 'repositories', 'betaRepository.ts'),
    `import type { Beta } from '@generic/pkg-lib'

/** @riviere-role role-b-repository */
export class BetaRepository {
  findById(id: string): Beta {
    return null as unknown as Beta
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
    path.join(workspaceDir, 'packages', 'pkg-lib', 'src', 'beta.ts'),
    `export class Beta {
  cancel(): void {}
}
`,
  )

  const result = runRoleEnforcement(workspacePackageConfig, workspaceDir)

  expect(result.exitCode).toBe(1)
  expect(result.stdout).toContain('only allows outputs [role-b]')

  rmSync(workspaceDir, {
    force: true,
    recursive: true,
  })
})
