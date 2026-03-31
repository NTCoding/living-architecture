import { location, roleEnforcement } from '@living-architecture/riviere-role-enforcement'
import { allRoles, type RoleName } from './roles'

const commandRoles: RoleName[] = [
  'command-use-case',
  'command-use-case-input',
  'command-use-case-result',
  'command-input-factory',
]

const domainRoles: RoleName[] = ['aggregate', 'value-object', 'domain-service']

const externalClientRoles: RoleName[] = [
  'external-client-service',
  'external-client-model',
  'external-client-error',
]

const cliPresentationRoles: RoleName[] = [
  'cli-output-formatter',
  'cli-input-validator',
  'command-input-factory',
  'value-object',
  'cli-error',
]

const platformInfraRoles: RoleName[] = [
  'external-client-service',
  'external-client-model',
  'external-client-error',
  'command-input-factory',
  'command-use-case-input',
]

const packages = ['packages/riviere-cli', 'packages/riviere-extract-ts']

export const config = roleEnforcement({
  packages,
  ignorePatterns: ['**/*.spec.ts', '**/__fixtures__/**', '**/*-fixtures.ts', '**/test-fixtures.ts'],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: allRoles,

  locations: [
    location<RoleName>('src/features')
      .subLocation('/entrypoint', ['cli-entrypoint'])
      .subLocation('/commands', commandRoles)
      .subLocation('/domain', domainRoles)
      .subLocation('/infra/external-clients/{client}', externalClientRoles)
      .subLocation('/infra/persistence', ['aggregate-repository'])
      .subLocation('/infra/cli/output', ['cli-output-formatter'])
      .subLocation('/builder/queries', ['domain-service', 'value-object']),

    location<RoleName>('src/platform')
      .subLocation('/domain', ['value-object', 'domain-service'])
      .subLocation('/infra/external-clients/{client}', externalClientRoles)
      .subLocation('/infra/cli-presentation', cliPresentationRoles)
      .subLocation('/infra/extraction-config', platformInfraRoles)
      .subLocation('/infra/graph-persistence', platformInfraRoles)
      .subLocation('/infra/source-filtering', platformInfraRoles)
      .subLocation('/infra/component-mapping', platformInfraRoles)
      .subLocation('/infra/errors', platformInfraRoles)
      .subLocation('/infra/git', externalClientRoles),

    location<RoleName>('src/shell', ['cli-entrypoint', 'command-input-factory']),
  ],
})
