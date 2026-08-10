import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import path from 'node:path'
import { it } from 'vitest'
import * as enforcementBuilder from '../domain/role-enforcement-builder'
import * as fixtureWorkspace from './test-fixture-workspace'

const layerTestRoles = [
  enforcementBuilder.role('technical-service', {targets: ['function', 'interface', 'type-alias'],}),
] as const

const layerTestConfig = enforcementBuilder.roleEnforcement({
  packages: ['packages/pkg-a'],
  canonicalConfigurationsFile: '.riviere/canonical-role-configurations.md',
  ignorePatterns: [],
  layerRules: [
    enforcementBuilder.layerRule('infra', {
      matches: ['**/infra/**'],
      mayImportLayers: ['infra'],
    }),
  ],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: layerTestRoles,
  locations: [
    enforcementBuilder.location<(typeof layerTestRoles)[number]['name']>('src', [
      'technical-service',
    ]),
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

/** @riviere-role technical-service */
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
      /Forbidden external import: 'adapters' cannot import external package 'node:path'/,
    )
  })
})

it('rejects imports between domain-port adapters', () => {
  fixtureWorkspace.withWorkspaceFixture(layerTestBootstrap, (workspaceDir) => {
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'packages/pkg-a/src/adapters/github/github-adapter.ts',
      `/** @riviere-role technical-service */
export function createGithubAdapter(): string {
  return 'github'
}
`,
    )
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'packages/pkg-a/src/adapters/oxlint/oxlint-adapter.ts',
      `import { createGithubAdapter } from '../github/github-adapter'

/** @riviere-role technical-service */
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
      /Forbidden layer import: 'adapters' may only import layers \[domain-port, external-client-api\]/,
    )
  })
})

it('rejects imports from infra to another internal layer', () => {
  fixtureWorkspace.withWorkspaceFixture(layerTestBootstrap, (workspaceDir) => {
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'packages/pkg-a/src/domain/domain-value.ts',
      `export const domainValue = 'domain'
`,
    )
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'packages/pkg-a/src/platform/infra/consumer.ts',
      `import { domainValue } from '../../domain/domain-value'

/** @riviere-role technical-service */
export function consume(): string {
  return domainValue
}
`,
    )

    const result = runLayerEnforcement(workspaceDir)

    assert.equal(result.exitCode, 1)
    assert.equal(result.stderr, '')
    assert.match(result.stdout, /Forbidden layer import: 'infra' may only import layers \[infra\]/)
    assert.match(result.stdout, /packages\/pkg-a\/src\/domain\/domain-value\.ts/)
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
      `export const domainValue = 'domain'
`,
    )
    fixtureWorkspace.writeFixtureFile(
      workspaceDir,
      'packages/pkg-a/src/platform/infra/consumer.ts',
      `import { domainValue } from '@generic/pkg-domain'

/** @riviere-role technical-service */
export function consume(): string {
  return domainValue
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
    layerRules: [
      enforcementBuilder.layerRule('adapters', {
        matches: ['**/adapters/**'],
        mayImportExternalPackages: false,
        mayImportLayers: ['domain-port', 'external-client-api'],
      }),
    ],
    roleDefinitionsDir: '.riviere/role-definitions',
    roles: layerTestRoles,
    locations: [
      enforcementBuilder.location<(typeof layerTestRoles)[number]['name']>('src', [
        'technical-service',
      ]),
    ],
  })
}
