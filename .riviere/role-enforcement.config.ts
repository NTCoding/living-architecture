import { location, roleEnforcement } from '@living-architecture/riviere-role-enforcement'
import { allRoles, type RoleName } from './roles'

const commandRoles: RoleName[] = [
  'command-orchestrator',
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
  'domain-service',
  'domain-error',
  'query-model',
]

const externalClientRoles: RoleName[] = [
  'external-client-service',
  'external-client-model',
  'external-client-error',
]

const cliPresentationRoles: RoleName[] = ['cli-output-formatter', 'cli-error']

const packages = [
  'packages/riviere-cli',
  'packages/riviere-extract-ts',
  'packages/riviere-builder',
  'packages/riviere-query',
  'packages/riviere-role-enforcement',
  'tools/dev-workflow',
  'tools/dev-workflow-v2',
]

export const config = roleEnforcement({
  packages,
  canonicalConfigurationsFile: '.riviere/canonical-role-configurations.md',
  ignorePatterns: ['**/*.spec.ts', '**/__fixtures__/**', '**/*-fixtures.ts', '**/test-fixtures.ts'],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: allRoles,
  workspacePackageSources: {
    '@living-architecture/riviere-builder': 'packages/riviere-builder/src/index.ts',
    '@living-architecture/riviere-query': 'packages/riviere-query/src/index.ts',
  },

  locations: [
    location<RoleName>('src/features/{feature}')
      .subLocation('/entrypoint', ['cli-entrypoint'], {
        forbiddenImports: ['**/infra/persistence/**'],
      })
      .subLocation('/commands', commandRoles, { forbiddenImports: ['**/infra/cli/**'] })
      .subLocation('/queries', queryRoles, { forbiddenImports: ['**/infra/cli/**'] })
      .subLocation('/domain', domainRoles)
      .subLocation('/infra/external-clients/{client}', externalClientRoles)
      .subLocation('/infra/persistence', ['aggregate-repository', 'query-model-loader'])
      .subLocation('/infra/cli/output', ['cli-output-formatter']),

    location<RoleName>('src/platform')
      .subLocation('/domain', domainRoles)
      .subLocation('/infra/external-clients/{client}', externalClientRoles)
      .subLocation('/infra/cli/input', ['cli-input-validator'])
      .subLocation('/infra/cli/presentation', cliPresentationRoles),

    location<RoleName>('src/shell', ['main']),
  ],
})
