import { location, roleEnforcement } from '@living-architecture/riviere-role-enforcement'
import { allRoles, type RoleName } from './roles'

const commandRoles: RoleName[] = [
  'command-use-case',
  'command-use-case-input',
  'command-use-case-result',
  'command-use-case-result-value',
  'command-input-factory',
]

const queryRoles: RoleName[] = [
  'query-model-use-case',
  'query-model-use-case-input',
  'query-model',
  'query-model-error',
]

const domainRoles: RoleName[] = [
  'aggregate',
  'value-object',
  'domain-event',
  'domain-port',
  'domain-service',
  'domain-error',
]

const externalClientRoles: RoleName[] = [
  'external-client-service',
  'external-client-model',
  'external-client-error',
]

const entrypointRoles: RoleName[] = [
  'cli-entrypoint',
  'cli-error-handler',
  'cli-output-formatter',
  'command-input-factory',
  'entrypoint-cli-input-parser',
]

const cliPresentationRoles: RoleName[] = [
  'cli-error',
  'cli-error-handler',
  'cli-output-formatter',
  'cli-response-formatter',
  'cli-response-writer',
]

const packages = [
  'packages/riviere-cli',
  'packages/riviere-extract-ts',
  'packages/riviere-builder',
  'packages/riviere-query',
  'packages/riviere-role-enforcement',
  'tools/dev-workflow-v2',
]

const domainDependencyRule = {
  enforceDependencies: false,
  locationName: 'domain',
  mayImportLocations: [] as const,
}

const domainPortDependencyRule = {
  locationName: 'domain-port',
  mayImportLocations: ['domain', 'domain-port'],
}

const infraDependencyRule = {
  locationName: 'infra',
  mayImportLocations: ['infra'],
}

export const config = roleEnforcement({
  packages,
  canonicalConfigurationsFile: '.riviere/canonical-role-configurations.md',
  ignorePatterns: [
    '**/*.spec.ts',
    '**/__fixtures__/**',
    '**/*-fixtures.ts',
    '**/test-fixtures.ts',
    '**/test-fixture-*.ts',
  ],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: allRoles,
  workspacePackageSources: {
    '@living-architecture/riviere-builder': 'packages/riviere-builder/src/index.ts',
    '@living-architecture/riviere-query': 'packages/riviere-query/src/index.ts',
  },

  locations: [
    location<RoleName>('src/features/{feature}')
      .subLocation('/entrypoint/{entrypoint}', entrypointRoles, {
        forbiddenImports: ['**/domain/**', '**/data-access/**'],
      })
      .subLocation('/commands', commandRoles, { forbiddenImports: ['**/infra/cli/**'] })
      .subLocation('/queries', queryRoles, { forbiddenImports: ['**/infra/cli/**'] })
      .subLocation('/domain', domainRoles, { dependencyRule: domainDependencyRule })
      .subLocation('/domain/ports', ['domain-port'], {
        dependencyRule: domainPortDependencyRule,
      })
      .subLocation('/data-access', ['aggregate-repository', 'query-model-loader'])
      .subLocation('/adapters/{adapter}', ['domain-port-adapter'], {
        dependencyRule: {
          locationName: 'adapters',
          mayImportExternalPackages: false,
          mayImportLocations: ['domain-port', 'external-client-api'],
        },
      }),

    location<RoleName>('src/platform')
      .subLocation('/domain', domainRoles, { dependencyRule: domainDependencyRule })
      .subLocation('/infra', [], { dependencyRule: infraDependencyRule })
      .subLocation('/infra/external-clients/{client}', externalClientRoles)
      .subLocation('/infra/external-clients/{client}/index.ts', [], {
        dependencyRule: {
          locationName: 'external-client-api',
          mayImportLocations: ['external-client-api', 'infra'],
        },
      })
      .subLocation('/infra/cli/input-parser', ['generic-cli-input-parser'])
      .subLocation('/infra/cli/presentation', cliPresentationRoles),

    location<RoleName>('src/entrypoint').subLocation('/_platform', entrypointRoles),

    location<RoleName>('src/shell', ['main', 'cli-error-handler']),
  ],
})
