import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import path from 'node:path'
import { it } from 'vitest'
import * as enforcementBuilder from '../domain/role-enforcement-builder'
import * as fixtureWorkspace from './test-fixture-workspace'

const layerTestRoles = [
  enforcementBuilder.role('role-infra', { targets: ['function', 'interface', 'type-alias'] }),
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

const layerTestLocations = enforcementBuilder.locationConfiguration(
  enforcementBuilder
    .location<(typeof layerTestRoles)[number]['name']>('src')
    .subLocation('/domain', ['domain-port'])
    .subLocation('/platform', [])
    .subLocation('/platform/infra', ['role-infra'], { dependencyRules: { locations: [] } }),
)

const layerTestConfig = enforcementBuilder.roleEnforcement({
  configurations: {
    test: {
      packages: ['packages/pkg-a'],
      locations: layerTestLocations,
    },
  },
  ignorePatterns: [],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: layerTestRoles,
})

const layerTestBootstrap = {
  prefix: 'role-enforcement-layer-',
  roles: layerTestRoles,
  files: {
    'packages/pkg-a/src/platform/infra/source.ts': `/** @riviere-role role-infra */
export function source(): string {
  return 'source'
}
`,
  },
}

const adapterLayerTestBootstrap = {
  ...layerTestBootstrap,
  files: {},
}

it('accepts imports within the infra layer', () => {
  fixtureWorkspace.withWorkspaceFixture(layerTestBootstrap, (workspaceDir) => {
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'packages/pkg-a/src/platform/infra/consumer.ts',
      `import { source } from './source'

/** @riviere-role role-infra */
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

/** @riviere-role role-infra */
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
  fixtureWorkspace.withWorkspaceFixture(adapterLayerTestBootstrap, (workspaceDir) => {
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
    assert.match(result.stdout, /Location '\/adapters' cannot import external package 'node:path'/)
  })
})

it('rejects imports between domain-port adapters', () => {
  fixtureWorkspace.withWorkspaceFixture(adapterLayerTestBootstrap, (workspaceDir) => {
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
  fixtureWorkspace.withWorkspaceFixture(adapterLayerTestBootstrap, (workspaceDir) => {
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

/** @riviere-role role-infra */
export function consume(port: DomainPort): string {
  return port.value()
}
`,
    )

    const result = runLayerEnforcement(workspaceDir)

    assert.equal(result.exitCode, 1)
    assert.equal(result.stderr, '')
    assert.match(result.stdout, /Location '\/platform\/infra' cannot import location '\/domain'/)
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

/** @riviere-role role-infra */
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

    const result = fixtureWorkspace.createTestRoleEnforcementApplication().execute({
      configDir: workspaceDir,
      configModule: { config: createCrossPackageLayerConfig() },
    })

    assert.equal(result.exitCode, 1)
    assert.equal(result.stderr, '')
    assert.match(result.stdout, /Location '\/platform\/infra' cannot import location '\/domain'/)
  })
})

function runLayerEnforcement(workspaceDir: string) {
  return fixtureWorkspace.createTestRoleEnforcementApplication().execute({
    configDir: workspaceDir,
    configModule: { config: layerTestConfig },
  })
}

function createAdapterLayerConfig() {
  const locations = enforcementBuilder.locationConfiguration(
    enforcementBuilder
      .location<(typeof layerTestRoles)[number]['name']>('src')
      .subLocation('/adapters', ['domain-port-adapter'], {
        allowAnySubLocations: true,
        dependencyRules: {
          externalPackages: [],
          locations: [
            {
              location: '/domain',
              roles: ['domain-port'],
            },
            {
              location: '/platform/infra',
              roles: ['external-client-service'],
            },
          ],
        },
      })
      .subLocation('/commands', ['command-use-case'])
      .subLocation('/domain', ['domain-port'], { allowAnySubLocations: true })
      .subLocation('/platform', [])
      .subLocation('/platform/infra', ['external-client-service']),
  )
  return enforcementBuilder.roleEnforcement({
    configurations: {
      test: {
        packages: ['packages/pkg-a'],
        locations,
      },
    },
    ignorePatterns: [],
    roleDefinitionsDir: '.riviere/role-definitions',
    roles: layerTestRoles,
  })
}

function createCrossPackageLayerConfig() {
  return enforcementBuilder.roleEnforcement({
    configurations: {
      application: {
        packages: ['packages/pkg-a'],
        locations: layerTestLocations,
      },
      domainPackage: {
        packages: ['packages/pkg-domain'],
        locations: enforcementBuilder.locationConfiguration(
          enforcementBuilder
            .location<(typeof layerTestRoles)[number]['name']>('src')
            .subLocation('/domain', ['domain-port'], { allowAnySubLocations: true }),
        ),
      },
    },
    ignorePatterns: [],
    roleDefinitionsDir: '.riviere/role-definitions',
    roles: layerTestRoles,
  })
}
