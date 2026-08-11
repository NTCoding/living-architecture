import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import path from 'node:path'
import { it } from 'vitest'
import * as enforcementBuilder from '../domain/role-enforcement-builder'
import * as fixtureWorkspace from './test-fixture-workspace'

const layerTestRoles = [
  enforcementBuilder.role('technical-service', {targets: ['function', 'interface', 'type-alias'],}),
  enforcementBuilder.role('domain-port', { targets: ['interface', 'type-alias'] }),
  enforcementBuilder.role('domain-port-adapter', {
    targets: ['function'],
    forbiddenDependencies: ['domain-port-adapter'],
  }),
  enforcementBuilder.role('command-use-case', {
    targets: ['function'],
    forbiddenDependencies: ['domain-port-adapter'],
  }),
  enforcementBuilder.role('external-client-service', { targets: ['function'] }),
] as const

const layerTestConfig = enforcementBuilder.roleEnforcement({
  packages: ['packages/pkg-a'],
  canonicalConfigurationsFile: '.riviere/canonical-role-configurations.md',
  ignorePatterns: [],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: layerTestRoles,
  locations: [
    enforcementBuilder
      .location<(typeof layerTestRoles)[number]['name']>('src')
      .subLocation('/platform/infra', ['technical-service'], { mayImportRoles: [] }),
  ],
})

const layerTestBootstrap = {
  prefix: 'role-enforcement-layer-',
  roles: layerTestRoles,
  files: {
    'packages/pkg-a/src/platform/infra/source.ts': `/** @riviere-role technical-service */
export function source(): string {
  return 'source'
}
`,
  },
}

it('accepts imports within the infra layer', () => {
  fixtureWorkspace.withWorkspaceFixture(layerTestBootstrap, (workspaceDir) => {
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'packages/pkg-a/src/platform/infra/consumer.ts',
      `import { source } from './source'

/** @riviere-role technical-service */
export function consume(): string {
  return source()
}
`,
    )

    const result = runLayerEnforcement(workspaceDir)

    assert.equal(result.exitCode, 0)
    assert.equal(result.stderr, '')
  })
})

it('accepts external library imports from infra', () => {
  fixtureWorkspace.withWorkspaceFixture(layerTestBootstrap, (workspaceDir) => {
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'packages/pkg-a/src/platform/infra/consumer.ts',
      `import path from 'node:path'

/** @riviere-role technical-service */
export function consume(): string {
  return path.basename('/tmp/example.txt')
}
`,
    )

    const result = runLayerEnforcement(workspaceDir)

    assert.equal(result.exitCode, 0)
    assert.equal(result.stderr, '')
  })
})

it('rejects direct external package imports from adapters', () => {
  fixtureWorkspace.withWorkspaceFixture(layerTestBootstrap, (workspaceDir) => {
    const adapterConfig = createAdapterLayerConfig()
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'packages/pkg-a/src/adapters/oxlint/oxlint-adapter.ts',
      `import path from 'node:path'

/** @riviere-role domain-port-adapter */
export function run(): string {
  return path.basename('/tmp/example.txt')
}
`,
    )

    const result = fixtureWorkspace.createTestRoleEnforcementApplication().execute({
      configDir: workspaceDir,
      configModule: { config: adapterConfig },
    })

    assert.equal(result.exitCode, 1)
    assert.match(
      result.stdout,
      /Forbidden external import: files in 'packages\/pkg-a\/src\/adapters' cannot import external package 'node:path'/,
    )
  })
})

it('rejects imports between domain-port adapters', () => {
  fixtureWorkspace.withWorkspaceFixture(layerTestBootstrap, (workspaceDir) => {
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'packages/pkg-a/src/adapters/github/github-adapter.ts',
      `/** @riviere-role domain-port-adapter */
export function createGithubAdapter(): string {
  return 'github'
}
`,
    )
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'packages/pkg-a/src/adapters/oxlint/oxlint-adapter.ts',
      `import { createGithubAdapter } from '../github/github-adapter'

/** @riviere-role domain-port-adapter */
export function createOxlintAdapter(): string {
  return createGithubAdapter()
}
`,
    )

    const result = fixtureWorkspace.createTestRoleEnforcementApplication().execute({
      configDir: workspaceDir,
      configModule: { config: createAdapterLayerConfig() },
    })

    assert.equal(result.exitCode, 1)
    assert.match(
      result.stdout,
      /Forbidden dependency: this file \(domain-port-adapter\) cannot import from a file exporting 'domain-port-adapter'/,
    )
  })
})

it('rejects commands importing concrete domain-port adapters', () => {
  fixtureWorkspace.withWorkspaceFixture(layerTestBootstrap, (workspaceDir) => {
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'packages/pkg-a/src/adapters/oxlint/oxlint-adapter.ts',
      `/** @riviere-role domain-port-adapter */
export function createOxlintAdapter(): string {
  return 'oxlint'
}
`,
    )
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'packages/pkg-a/src/commands/run.ts',
      `import { createOxlintAdapter } from '../adapters/oxlint/oxlint-adapter'

/** @riviere-role command-use-case */
export function run(): string {
  return createOxlintAdapter()
}
`,
    )

    const result = fixtureWorkspace.createTestRoleEnforcementApplication().execute({
      configDir: workspaceDir,
      configModule: { config: createAdapterLayerConfig() },
    })

    assert.equal(result.exitCode, 1)
    assert.match(
      result.stdout,
      /Forbidden dependency: this file \(command-use-case\) cannot import from a file exporting 'domain-port-adapter'/,
    )
  })
})

it('rejects imports from infra to another internal layer', () => {
  fixtureWorkspace.withWorkspaceFixture(layerTestBootstrap, (workspaceDir) => {
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'packages/pkg-a/src/domain/domain-port.ts',
      `/** @riviere-role domain-port */
export interface DomainPort {
  value(): string
}
`,
    )
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'packages/pkg-a/src/platform/infra/consumer.ts',
      `import type { DomainPort } from '../../domain/domain-port'

/** @riviere-role technical-service */
export function consume(port: DomainPort): string {
  return port.value()
}
`,
    )

    const result = runLayerEnforcement(workspaceDir)

    assert.equal(result.exitCode, 1)
    assert.equal(result.stderr, '')
    assert.match(
      result.stdout,
      /Forbidden role import: files in 'packages\/pkg-a\/src\/platform\/infra' may only import roles \[\] across that location boundary/,
    )
    assert.match(result.stdout, /packages\/pkg-a\/src\/domain\/domain-port\.ts/)
  })
})

it('rejects workspace package imports from infra when the target is not infra', () => {
  fixtureWorkspace.withWorkspaceFixture(layerTestBootstrap, (workspaceDir) => {
    const packageManifest = {
      name: '@generic/pkg-domain',
      exports: {
        '.': { '@living-architecture/source': './src/index.ts' },
        './package.json': './package.json',
      },
    }
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'packages/pkg-domain/package.json',
      JSON.stringify(packageManifest),
    )
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'packages/pkg-domain/src/index.ts',
      `export type { DomainPort } from './domain/domain-port'
`,
    )
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'packages/pkg-domain/src/domain/domain-port.ts',
      `/** @riviere-role domain-port */
export interface DomainPort {
  value(): string
}
`,
    )
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'packages/pkg-a/src/platform/infra/consumer.ts',
      `import type { DomainPort } from '@generic/pkg-domain'

/** @riviere-role technical-service */
export function consume(port: DomainPort): string {
  return port.value()
}
`,
    )
    const packageScopeDir = path.join(workspaceDir, 'node_modules/@generic')
    fs.mkdirSync(packageScopeDir, { recursive: true })
    fs.symlinkSync(
      path.join(workspaceDir, 'packages/pkg-domain'),
      path.join(packageScopeDir, 'pkg-domain'),
      'dir',
    )

    const result = runLayerEnforcement(workspaceDir)

    assert.equal(result.exitCode, 1)
    assert.equal(result.stderr, '')
    assert.match(result.stdout, /packages\/pkg-domain\/src\/index\.ts/)
  })
})

function runLayerEnforcement(workspaceDir: string) {
  return fixtureWorkspace.createTestRoleEnforcementApplication().execute({
    configDir: workspaceDir,
    configModule: { config: layerTestConfig },
  })
}

function createAdapterLayerConfig() {
  return enforcementBuilder.roleEnforcement({
    packages: ['packages/pkg-a'],
    canonicalConfigurationsFile: '.riviere/canonical-role-configurations.md',
    ignorePatterns: [],
    roleDefinitionsDir: '.riviere/role-definitions',
    roles: layerTestRoles,
    locations: [
      enforcementBuilder.location<(typeof layerTestRoles)[number]['name']>('src', [
        'command-use-case',
        'technical-service',
      ]),
      enforcementBuilder
        .location<(typeof layerTestRoles)[number]['name']>('src')
        .subLocation('/adapters', ['domain-port-adapter'], {
          mayImportExternalPackages: false,
          mayImportRoles: ['domain-port', 'external-client-service'],
        })
        .subLocation('/domain/ports', ['domain-port'])
        .subLocation('/platform/infra', ['external-client-service']),
    ],
  })
}
