import assert from 'node:assert/strict'
import { it } from 'vitest'
import {
  location,
  locationConfiguration,
  role,
  RoleEnforcementConfiguration,
} from '@living-architecture/riviere-role-enforcement-domain-model'
import * as fixtureWorkspace from './__fixtures__/test-fixture-workspace'

const roles = [role('example', { targets: ['function'] })] as const
type RoleName = (typeof roles)[number]['name']

it("ownSubdomain treats a path segment placeholder called '{subdomain}' as a subdomain", () => {
  runBoundaryFixture(
    'modules/alpha/consumer/src/actions/consume.ts',
    `import { value } from '../../../provider/src/api/value'

/** @riviere-role example */
export function consume(): string { return value() }
`,
    (result) => assert.equal(result.exitCode, 0, result.stdout),
  )
})

it('rejects an import that has not been allowed by its location', () => {
  runBoundaryFixture(
    'modules/alpha/provider/src/api/consume.ts',
    `import { alpha } from '../../../consumer/src/actions/alpha'

/** @riviere-role example */
export function consume(): string { return alpha() }
`,
    (result) => {
      assert.equal(result.exitCode, 1)
      assert.match(result.stdout, /Location '\/api' cannot import location '\/actions'/)
    },
  )
})

it('does not apply an own-subdomain allowance to another subdomain', () => {
  runBoundaryFixture(
    'modules/alpha/consumer/src/actions/consume.ts',
    `import { value } from '../../../../beta/provider/src/api/value'

/** @riviere-role example */
export function consume(): string { return value() }
`,
    (result) => {
      assert.equal(result.exitCode, 1)
      assert.match(result.stdout, /Location '\/actions' cannot import location '\/api'/)
    },
  )
})

it('ownSubdomain does not treat a differently named path segment placeholder as a subdomain', () => {
  runGenericBoundaryFixture(
    'groups/alpha/consumer/src/actions/consume.ts',
    `import { value } from '../../../provider/src/api/value'

/** @riviere-role example */
export function consume(): string { return value() }
`,
    (result) => {
      assert.equal(result.exitCode, 1)
      assert.match(result.stdout, /Location '\/actions' cannot import location '\/api'/)
    },
  )
})

it("anySubdomain treats a path segment placeholder called '{subdomain}' as a subdomain", () => {
  const consumerLocations = locationConfiguration(
    location<RoleName>('/actions', ['example'], {
      allowAnySubLocations: true,
      importRules: { allow: { anySubdomain: ['api'] } },
    }),
  )
  runBoundaryFixture(
    'modules/alpha/consumer/src/actions/consume.ts',
    `import { value } from '../../../../beta/provider/src/api/value'

/** @riviere-role example */
export function consume(): string { return value() }
`,
    (result) => assert.equal(result.exitCode, 0, result.stdout),
    consumerLocations,
  )
})

it('allows a package to import allowed packages from multiple subdomains', () => {
  runBoundaryFixture(
    'interfaces/cli/src/entry/consume.ts',
    `import { alpha } from '../../../../modules/alpha/consumer/src/actions/alpha'
import { beta } from '../../../../modules/beta/consumer/src/actions/beta'

/** @riviere-role example */
export function consume(): string { return alpha() + beta() }
`,
    (result) => assert.equal(result.exitCode, 0, result.stdout),
  )
})

it('anySubdomain does not treat a differently named path segment placeholder as a subdomain', () => {
  runGenericBoundaryFixture(
    'interfaces/cli/src/entry/consume.ts',
    `import { alpha } from '../../../../groups/alpha/consumer/src/actions/alpha'

/** @riviere-role example */
export function consume(): string { return alpha() }
`,
    (result) => {
      assert.equal(result.exitCode, 1)
      assert.match(result.stdout, /Location '\/entry' cannot import location '\/actions'/)
    },
  )
})

it('rejects a package importing a package type it was not allowed', () => {
  runBoundaryFixture(
    'interfaces/cli/src/entry/consume.ts',
    `import { value } from '../../../../modules/alpha/provider/src/api/value'

/** @riviere-role example */
export function consume(): string { return value() }
`,
    (result) => {
      assert.equal(result.exitCode, 1)
      assert.match(result.stdout, /Location '\/entry' cannot import location '\/api'/)
    },
  )
})

it('rejects imports into a package that no package may import', () => {
  runBoundaryFixture(
    'modules/alpha/provider/src/api/consume.ts',
    `import { main } from '../../../../../interfaces/cli/src/entry/main'

/** @riviere-role example */
export function consume(): void { main() }
`,
    (result) => {
      assert.equal(result.exitCode, 1)
      assert.match(result.stdout, /Location '\/api' cannot import location '\/entry'/)
    },
  )
})

function runBoundaryFixture(
  filePath: string,
  contents: string,
  assertResult: (result: { exitCode: number; stderr: string; stdout: string }) => void,
  configuredConsumerLocations = consumerLocations(),
): void {
  fixtureWorkspace.withWorkspaceFixture(
    {
      prefix: 'role-enforcement-package-boundary-',
      roles,
      files: {
        'interfaces/cli/src/entry/main.ts': roleFunction('main', 'void'),
        'modules/alpha/provider/src/api/value.ts': roleFunction('value', 'string'),
        'modules/alpha/consumer/src/actions/alpha.ts': roleFunction('alpha', 'string'),
        'modules/beta/provider/src/api/value.ts': roleFunction('value', 'string'),
        'modules/beta/consumer/src/actions/beta.ts': roleFunction('beta', 'string'),
        [filePath]: contents,
      },
    },
    (workspaceDir) => {
      const provider = {
        locations: locationConfiguration(
          location<RoleName>('/api', ['example'], {
            allowAnySubLocations: true,
            importRules: { allow: {} },
          }),
        ),
      }
      const consumer = {
        locations: configuredConsumerLocations,
      }
      const interfacePackage = {
        locations: locationConfiguration(
          location<RoleName>('/entry', ['example'], {
            allowAnySubLocations: true,
            importRules: { allow: { anySubdomain: ['actions'] } },
          }),
        ),
      }
      const result = fixtureWorkspace.runTestRoleEnforcement(
        RoleEnforcementConfiguration.parse({
          configurations: {
            'interfaces/': interfacePackage,
            'modules/{subdomain}/consumer': consumer,
            'modules/{subdomain}/provider': provider,
          },
          ignorePatterns: [],
          roleDefinitionsDir: '.riviere/role-definitions',
          roles,
        }),
        workspaceDir,
      )
      assertResult(result)
    },
  )
}

function runGenericBoundaryFixture(
  filePath: string,
  contents: string,
  assertResult: (result: { exitCode: number; stderr: string; stdout: string }) => void,
): void {
  fixtureWorkspace.withWorkspaceFixture(
    {
      prefix: 'role-enforcement-generic-boundary-',
      roles,
      files: {
        'interfaces/cli/src/entry/main.ts': roleFunction('main', 'void'),
        'groups/alpha/provider/src/api/value.ts': roleFunction('value', 'string'),
        'groups/alpha/consumer/src/actions/alpha.ts': roleFunction('alpha', 'string'),
        [filePath]: contents,
      },
    },
    (workspaceDir) => {
      const provider = {
        locations: locationConfiguration(
          location<RoleName>('/api', ['example'], {
            allowAnySubLocations: true,
            importRules: { allow: {} },
          }),
        ),
      }
      const consumer = {
        locations: consumerLocations(),
      }
      const interfacePackage = {
        locations: locationConfiguration(
          location<RoleName>('/entry', ['example'], {
            allowAnySubLocations: true,
            importRules: { allow: { anySubdomain: ['actions'] } },
          }),
        ),
      }
      const result = fixtureWorkspace.runTestRoleEnforcement(
        RoleEnforcementConfiguration.parse({
          configurations: {
            'interfaces/': interfacePackage,
            'groups/{boundary}/consumer': consumer,
            'groups/{boundary}/provider': provider,
          },
          ignorePatterns: [],
          roleDefinitionsDir: '.riviere/role-definitions',
          roles,
        }),
        workspaceDir,
      )
      assertResult(result)
    },
  )
}

function consumerLocations() {
  return locationConfiguration(
    location<RoleName>('/actions', ['example'], {
      allowAnySubLocations: true,
      importRules: { allow: { ownSubdomain: ['api'] } },
    }),
  )
}

function roleFunction(name: string, returnType: 'string' | 'void'): string {
  const body = returnType === 'string' ? `return '${name}'` : ''
  return `/** @riviere-role example */
export function ${name}(): ${returnType} { ${body} }
`
}
