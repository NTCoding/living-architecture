import {
  location,
  locationConfiguration,
} from '@living-architecture/riviere-role-enforcement'
import type { RoleName } from '../roles'

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

export const standard = {
  packages: [
    'packages/riviere-cli',
    'packages/riviere-extract-ts',
    'packages/riviere-builder',
    'packages/riviere-query',
    'packages/riviere-role-enforcement',
    'tools/dev-workflow-v2',
  ],
  locations: locationConfiguration(
    location<RoleName>('src'),

    location<RoleName>('src/features/{feature}', {
      dependencyRules: { canImportSiblings: false },
    })
      .subLocation('/adapters/{adapter}', ['domain-port-adapter'], {
        dependencyRules: {
          externalPackages: [],
          locations: [
            { location: '/domain', roles: ['domain-port'] },
            {
              location: '/infra/external-clients/{client}',
              roles: externalClientRoles,
            },
          ],
        },
      })
      .subLocation('/commands', commandRoles)
      .subLocation('/data-access', ['aggregate-repository', 'query-model-loader'])
      .subLocation('/data-access/extraction-project', [])
      .subLocation('/domain', domainRoles, {
        allowAnySubLocations: true,
        dependencyRules: { locations: [{ location: '/domain' }] },
      })
      .subLocation('/entrypoint', [])
      .subLocation('/entrypoint/_platform', entrypointRoles, {
        dependencyRules: { importableFrom: 'withinParentLocation' },
      })
      .subLocation('/entrypoint/_platform/cli', [])
      .subLocation('/entrypoint/{entrypoint}', entrypointRoles)
      .subLocation('/queries', queryRoles),

    location<RoleName>('src/platform')
      .subLocation('/adapters/{adapter}', ['domain-port-adapter'], {
        dependencyRules: {
          externalPackages: [],
          locations: [
            { location: '/domain', roles: ['domain-port'] },
            {
              location: '/infra/external-clients/{client}',
              roles: externalClientRoles,
            },
          ],
        },
      })
      .subLocation('/domain', domainRoles, {
        allowAnySubLocations: true,
        dependencyRules: { locations: [{ location: '/domain' }] },
      })
      .subLocation('/infra', [], {
        dependencyRules: { locations: [] },
      })
      .subLocation('/infra/external-clients/{client}', externalClientRoles)
      .subLocation('/infra/cli/input', ['generic-cli-input-parser'])
      .subLocation('/infra/cli/presentation', cliPresentationRoles),

    location<RoleName>('src/shell', ['main', 'cli-error-handler']),
  ),
}
