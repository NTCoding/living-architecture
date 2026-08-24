import assert from 'node:assert/strict'
import { it } from 'vitest'
import {
  location,
  locationConfiguration,
  role,
  roleEnforcementConfiguration,
} from '@living-architecture/riviere-role-enforcement-domain-model'
import {
  runTestRoleEnforcement,
  withWorkspaceFixture,
  writeFixtureFile,
} from './__fixtures__/test-fixture-workspace'

const roles = [
  role('facade', {
    targets: ['class'],
    allowedDependentRoles: ['consumer', 'consumer-value'],
  }),
  role('consumer', { targets: ['function'] }),
  role('consumer-value', { targets: ['type-alias'] }),
  role('internal-service', { targets: ['function'] }),
] as const

const config = roleEnforcementConfiguration({
  configurations: {
    'packages/pkg-a': {
      locations: locationConfiguration(
        location('/domain', ['facade', 'consumer', 'consumer-value', 'internal-service']),
      ),
    },
  },
  ignorePatterns: [],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles,
})

const bootstrap = {
  prefix: 'allowed-dependent-roles-',
  roles,
  files: {
    'packages/pkg-a/src/domain/facade.ts': `/** @riviere-role facade */
export class Facade {
  read(): string {
    return 'value'
  }
}
`,
  },
}

it('accepts value and type references from allowed dependent roles', () => {
  withWorkspaceFixture(bootstrap, (workspaceDir) => {
    writeFixtureFile(
      workspaceDir,
      'packages/pkg-a/src/domain/consumer.ts',
      `import { Facade } from './facade'

/** @riviere-role consumer */
export function readValue(): string {
  return new Facade().read()
}

/** @riviere-role consumer-value */
export type FacadeResult = ReturnType<Facade['read']>
`,
    )

    const result = runTestRoleEnforcement(config, workspaceDir)
    assert.equal(result.exitCode, 0)
    assert.equal(result.stderr, '')
  })
})

it('rejects references from roles outside the target whitelist', () => {
  withWorkspaceFixture(bootstrap, (workspaceDir) => {
    writeFixtureFile(
      workspaceDir,
      'packages/pkg-a/src/domain/internal-service.ts',
      `import { Facade } from './facade'

/** @riviere-role internal-service */
export function readInternally(): string {
  return new Facade().read()
}
`,
    )

    const result = runTestRoleEnforcement(config, workspaceDir)
    assert.equal(result.exitCode, 1)
    assert.equal(result.stderr, '')
    assert.match(
      result.stdout,
      /Role 'facade' only allows dependent roles \[consumer, consumer-value\] but is referenced by role\(s\) internal-service/,
    )
  })
})
