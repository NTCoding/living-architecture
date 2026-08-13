import assert from 'node:assert/strict'
import { it } from 'vitest'
import * as enforcementBuilder from '@living-architecture/riviere-role-enforcement'
import * as fixtureWorkspace from './test-fixture-workspace'

const roles = [
  enforcementBuilder.role('role-value', {
    targets: ['interface'],
    forbiddenDependencies: ['role-service'],
  }),
  enforcementBuilder.role('role-service', { targets: ['function'] }),
  enforcementBuilder.role('role-restricted-service', {
    targets: ['function'],
    forbiddenDependencies: ['role-service'],
  }),
] as const

const config = enforcementBuilder.roleEnforcementConfiguration({
  configurations: {
    'packages/pkg-a': {
      locations: enforcementBuilder.locationConfiguration(
        enforcementBuilder.location('/domain', [
          'role-value',
          'role-service',
          'role-restricted-service',
        ]),
      ),
    },
  },
  ignorePatterns: [],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles,
})

const bootstrap = {
  prefix: 'role-enforcement-references-',
  roles,
  files: {},
}

it('ignores unreferenced roles in an imported file', () => {
  fixtureWorkspace.withWorkspaceFixture(bootstrap, (workspaceDir) => {
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'packages/pkg-a/src/domain/mixed.ts',
      `/** @riviere-role role-value */
export interface DomainValue {
  readonly value: string
}

/** @riviere-role role-service */
export function createDomainValue(value: string): DomainValue {
  return { value }
}
`,
    )
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'packages/pkg-a/src/domain/consumer.ts',
      `import type { DomainValue } from './mixed'

/** @riviere-role role-value */
export interface ConsumerValue {
  readonly domainValue: DomainValue
}
`,
    )

    assertPasses(workspaceDir)
  })
})

it('only validates roles that reference other roles', () => {
  fixtureWorkspace.withWorkspaceFixture(bootstrap, (workspaceDir) => {
    writeService(workspaceDir)
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'packages/pkg-a/src/domain/consumer.ts',
      `import { createValue } from './service'

/** @riviere-role role-value */
export interface DomainValue {
  readonly value: string
}

/** @riviere-role role-service */
export function createDomainValue(): DomainValue {
  return { value: createValue() }
}
`,
    )

    assertPasses(workspaceDir)
  })
})

it('follows an import through an internal function', () => {
  fixtureWorkspace.withWorkspaceFixture(bootstrap, (workspaceDir) => {
    writeService(workspaceDir)
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'packages/pkg-a/src/domain/consumer.ts',
      `import { createValue } from './service'

/** @riviere-role role-value */
export interface DomainValue {
  readonly value: string
}

function buildValue(): string {
  return createValue()
}

/** @riviere-role role-service */
export function createDomainValue(): DomainValue {
  return { value: buildValue() }
}
`,
    )

    assertPasses(workspaceDir)
  })
})

it('rejects a forbidden role referenced through an internal function', () => {
  fixtureWorkspace.withWorkspaceFixture(bootstrap, (workspaceDir) => {
    writeService(workspaceDir)
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'packages/pkg-a/src/domain/consumer.ts',
      `import { createValue } from './service'

function buildValue(): string {
  return createValue()
}

/** @riviere-role role-restricted-service */
export function createRestrictedValue(): string {
  return buildValue()
}
`,
    )

    const result = runEnforcement(workspaceDir)

    assert.equal(result.exitCode, 1)
    assert.match(
      result.stdout,
      /Forbidden dependency: this file \(role-restricted-service\) cannot import from a file exporting 'role-service'/,
    )
  })
})

function writeService(workspaceDir: string): void {
  fixtureWorkspace.writeFixtureFile(
    workspaceDir,
    'packages/pkg-a/src/domain/service.ts',
    `/** @riviere-role role-service */
export function createValue(): string {
  return 'value'
}
`,
  )
}

function assertPasses(workspaceDir: string): void {
  const result = runEnforcement(workspaceDir)
  assert.equal(result.exitCode, 0)
  assert.equal(result.stderr, '')
}

function runEnforcement(workspaceDir: string) {
  return fixtureWorkspace.createTestRoleEnforcementApplication().execute({
    configDir: workspaceDir,
    configModule: { config },
  })
}
