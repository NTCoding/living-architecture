import { expect, it } from 'vitest'
import {
  location,
  locationConfiguration,
  role,
  roleEnforcementConfiguration,
} from '../domain/role-enforcement-builder'
import {
  createTestRoleEnforcementApplication,
  withWorkspaceFixture,
  writeFixtureFile,
} from './test-fixture-workspace'

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

const workspacePackageConfig = roleEnforcementConfiguration({
  configurations: {
    test: {
      packages: ['packages/pkg-a'],
      locations: locationConfiguration(location('/repositories', ['role-b-repository'])),
    },
  },
  ignorePatterns: [],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: workspacePackageTestRoles,
})

const workspacePackageBootstrap = {
  prefix: 'role-enforcement-pkg-',
  roles: workspacePackageTestRoles,
  files: {
    'node_modules/@generic/pkg-lib/package.json': JSON.stringify({
      name: '@generic/pkg-lib',
      exports: {
        '.': { '@living-architecture/source': './src/index.ts' },
        './package.json': './package.json',
        './domain/*': { '@living-architecture/source': './src/domain/*.ts' },
        './duplicated/*': { '@living-architecture/source': './src/*/domain/*.ts' },
      },
    }),
    'node_modules/@generic/pkg-lib/src/beta.ts': `/** @riviere-role role-b */
export class Beta {
  cancel(): void {}
}
`,
    'node_modules/@generic/pkg-lib/src/index.ts': `export * from './beta'
`,
    'packages/pkg-a/src/repositories/betaRepository.ts': `import type { Beta } from '@generic/pkg-lib'

/** @riviere-role role-b-repository */
export class BetaRepository {
  findById(id: string): Beta {
    return null as unknown as Beta
  }
}
`,
  },
}

it('accepts aggregate-repository returning aggregate from workspace package via barrel export', () => {
  withWorkspaceFixture(workspacePackageBootstrap, (workspaceDir) => {
    const result = createTestRoleEnforcementApplication().execute({
      configDir: workspaceDir,
      configModule: { config: workspacePackageConfig },
    })

    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
  })
})

it('resolves roles imported from a workspace package subpath', () => {
  withWorkspaceFixture(workspacePackageBootstrap, (workspaceDir) => {
    writeFixtureFile(
      workspaceDir,
      'node_modules/@generic/pkg-lib/src/domain/beta.ts',
      `/** @riviere-role role-b */
export class Beta {
  cancel(): void {}
}
`,
    )
    writeFixtureFile(
      workspaceDir,
      'packages/pkg-a/src/repositories/betaRepository.ts',
      `import type { Beta } from '@generic/pkg-lib/domain/beta'

/** @riviere-role role-b-repository */
export class BetaRepository {
  findById(id: string): Beta {
    return null as unknown as Beta
  }
}
`,
    )

    const result = createTestRoleEnforcementApplication().execute({
      configDir: workspaceDir,
      configModule: { config: workspacePackageConfig },
    })

    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
  })
})

it('replaces every wildcard in a workspace package source path', () => {
  withWorkspaceFixture(workspacePackageBootstrap, (workspaceDir) => {
    writeFixtureFile(
      workspaceDir,
      'node_modules/@generic/pkg-lib/src/beta/domain/beta.ts',
      `/** @riviere-role role-b */
export class Beta {
  cancel(): void {}
}
`,
    )
    writeFixtureFile(
      workspaceDir,
      'packages/pkg-a/src/repositories/betaRepository.ts',
      `import type { Beta } from '@generic/pkg-lib/duplicated/beta'

/** @riviere-role role-b-repository */
export class BetaRepository {
  findById(id: string): Beta {
    return null as unknown as Beta
  }
}
`,
    )

    const result = createTestRoleEnforcementApplication().execute({
      configDir: workspaceDir,
      configModule: { config: workspacePackageConfig },
    })

    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
  })
})

it('rejects aggregate-repository returning unannotated class from workspace package', () => {
  withWorkspaceFixture(workspacePackageBootstrap, (workspaceDir) => {
    writeFixtureFile(
      workspaceDir,
      'node_modules/@generic/pkg-lib/src/beta.ts',
      `export class Beta {
  cancel(): void {}
}
`,
    )

    const result = createTestRoleEnforcementApplication().execute({
      configDir: workspaceDir,
      configModule: { config: workspacePackageConfig },
    })

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain('only allows outputs [role-b]')
  })
})
