import assert from 'node:assert/strict'
import { it } from 'vitest'
import {
  location,
  locationConfiguration,
  role,
  roleEnforcementConfiguration,
} from '@living-architecture/riviere-role-enforcement'
import * as fixtureWorkspace from './test-fixture-workspace'

const roles = [role('example', { targets: ['function'] })] as const
type RoleName = (typeof roles)[number]['name']

const locations = locationConfiguration(
  location<RoleName>('/domain', ['example'], { allowAnySubLocations: true }),
  location<RoleName>('/commands', ['example'], { allowAnySubLocations: true }),
  location<RoleName>('/entrypoint', ['example'], { allowAnySubLocations: true }),
)

it('allows use cases to import their own domain model', () => {
  withBoundaryFixture((workspaceDir) => {
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'packages/alpha/use-cases/src/commands/consume.ts',
      `import { value } from '../../../domain-model/src/domain/value'

/** @riviere-role example */
export function consume(): string {
  return value()
}
`,
    )

    const result = runBoundaryEnforcement(workspaceDir)

    assert.equal(result.exitCode, 0)
    assert.equal(result.stderr, '')
  })
})

it('rejects a domain model importing its use cases', () => {
  withBoundaryFixture((workspaceDir) => {
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'packages/alpha/domain-model/src/domain/consume.ts',
      `import { alpha } from '../../../use-cases/src/commands/alpha'

/** @riviere-role example */
export function consume(): string {
  return alpha()
}
`,
    )

    const result = runBoundaryEnforcement(workspaceDir)

    assert.equal(result.exitCode, 1)
    assert.match(
      result.stdout,
      /A domain-model package can import only published-language packages/,
    )
  })
})

it('rejects a domain model importing another subdomain', () => {
  withBoundaryFixture((workspaceDir) => {
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'packages/alpha/domain-model/src/domain/consume.ts',
      `import { value } from '../../../../beta/domain-model/src/domain/value'

/** @riviere-role example */
export function consume(): string {
  return value()
}
`,
    )

    const result = runBoundaryEnforcement(workspaceDir)

    assert.equal(result.exitCode, 1)
    assert.match(
      result.stdout,
      /A domain-model package can import only published-language packages/,
    )
  })
})

it('rejects use cases importing another subdomain', () => {
  withBoundaryFixture((workspaceDir) => {
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'packages/alpha/use-cases/src/commands/consume.ts',
      `import { value } from '../../../../beta/domain-model/src/domain/value'

/** @riviere-role example */
export function consume(): string {
  return value()
}
`,
    )

    const result = runBoundaryEnforcement(workspaceDir)

    assert.equal(result.exitCode, 1)
    assert.match(
      result.stdout,
      /Use-cases for 'alpha' cannot import 'packages\/beta\/domain-model'/,
    )
  })
})

it('does not let a location import rule override the subdomain boundary', () => {
  withBoundaryFixture((workspaceDir) => {
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'packages/alpha/use-cases/src/commands/consume.ts',
      `import { value } from '../../../../beta/domain-model/src/domain/value'

/** @riviere-role example */
export function consume(): string {
  return value()
}
`,
    )

    const result = runBoundaryEnforcement(
      workspaceDir,
      locationConfiguration(
        location<RoleName>('/commands', ['example'], {
          allowAnySubLocations: true,
          importRules: { allow: { root: ['domain'] } },
        }),
        location<RoleName>('/domain', ['example'], { allowAnySubLocations: true }),
        location<RoleName>('/entrypoint', ['example'], { allowAnySubLocations: true }),
      ),
    )

    assert.equal(result.exitCode, 1)
    assert.match(
      result.stdout,
      /Use-cases for 'alpha' cannot import 'packages\/beta\/domain-model'/,
    )
  })
})

it('allows an app to aggregate multiple subdomains', () => {
  withBoundaryFixture((workspaceDir) => {
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'apps/cli/src/entrypoint/consume.ts',
      `import { alpha } from '../../../../packages/alpha/use-cases/src/commands/alpha'
import { beta } from '../../../../packages/beta/use-cases/src/commands/beta'

/** @riviere-role example */
export function consume(): string {
  return alpha() + beta()
}
`,
    )

    const result = runBoundaryEnforcement(workspaceDir)

    assert.equal(result.exitCode, 0)
    assert.equal(result.stderr, '')
  })
})

it('rejects an app importing a domain model directly', () => {
  withBoundaryFixture((workspaceDir) => {
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'apps/cli/src/entrypoint/consume.ts',
      `import { value } from '../../../../packages/alpha/domain-model/src/domain/value'

/** @riviere-role example */
export function consume(): string {
  return value()
}
`,
    )

    const result = runBoundaryEnforcement(workspaceDir)

    assert.equal(result.exitCode, 1)
    assert.match(result.stdout, /An app cannot import 'domain-model' directly/)
  })
})

it('rejects a domain model importing an app', () => {
  withBoundaryFixture((workspaceDir) => {
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'packages/alpha/domain-model/src/domain/consume.ts',
      `import { main } from '../../../../../apps/cli/src/entrypoint/main'

/** @riviere-role example */
export function consume(): void {
  main()
}
`,
    )

    const result = runBoundaryEnforcement(workspaceDir)

    assert.equal(result.exitCode, 1)
    assert.match(result.stdout, /No package can import an app/)
  })
})

it('rejects use cases importing an app', () => {
  withBoundaryFixture((workspaceDir) => {
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'packages/alpha/use-cases/src/commands/consume.ts',
      `import { main } from '../../../../../apps/cli/src/entrypoint/main'

/** @riviere-role example */
export function consume(): void {
  main()
}
`,
    )

    const result = runBoundaryEnforcement(workspaceDir)

    assert.equal(result.exitCode, 1)
    assert.match(result.stdout, /No package can import an app/)
  })
})

function withBoundaryFixture(fn: (workspaceDir: string) => void): void {
  fixtureWorkspace.withWorkspaceFixture(
    {
      prefix: 'role-enforcement-subdomain-boundary-',
      roles,
      files: {
        'apps/cli/src/entrypoint/main.ts': `/** @riviere-role example */
export function main(): void {}
`,
        'packages/alpha/domain-model/src/domain/value.ts': `/** @riviere-role example */
export function value(): string {
  return 'alpha'
}
`,
        'packages/alpha/use-cases/src/commands/alpha.ts': `/** @riviere-role example */
export function alpha(): string {
  return 'alpha'
}
`,
        'packages/beta/domain-model/src/domain/value.ts': `/** @riviere-role example */
export function value(): string {
  return 'beta'
}
`,
        'packages/beta/use-cases/src/commands/beta.ts': `/** @riviere-role example */
export function beta(): string {
  return 'beta'
}
`,
      },
    },
    fn,
  )
}

function runBoundaryEnforcement(workspaceDir: string, configuredLocations = locations) {
  return fixtureWorkspace.createTestRoleEnforcementApplication().execute({
    configDir: workspaceDir,
    configModule: {
      config: roleEnforcementConfiguration({
        configurations: {
          'packages/alpha/domain-model': {
            locations: locationConfiguration(
              location<RoleName>('/domain', ['example'], { allowAnySubLocations: true }),
            ),
          },
          'packages/alpha/use-cases': { locations: configuredLocations },
          'packages/beta/domain-model': {
            locations: locationConfiguration(
              location<RoleName>('/domain', ['example'], { allowAnySubLocations: true }),
            ),
          },
          'packages/beta/use-cases': { locations: configuredLocations },
          'apps/cli': {
            locations: locationConfiguration(
              location<RoleName>('/entrypoint', ['example'], { allowAnySubLocations: true }),
            ),
          },
        },
        ignorePatterns: [],
        roleDefinitionsDir: '.riviere/role-definitions',
        roles,
      }),
    },
  })
}
