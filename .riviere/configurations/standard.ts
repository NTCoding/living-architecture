import { location, locationConfiguration } from '@living-architecture/riviere-role-enforcement'
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
    location<RoleName>('/features/{feature}', {
      dependencyRules: { canImportSiblings: false },
    })
      .subLocation('/adapters/{adapter}', ['domain-port-adapter'], {
        dependencyRules: {
          locations: [
            { location: '/domain', roles: ['domain-port'] },
            {
              location: '/infra/external-clients/{client}',
              roles: externalClientRoles,
            },
          ],
        },
      })
      .subLocation('/commands', commandRoles, {
        dependencyRules: {
          locations: [{ location: '/domain' }, { location: '/data-access' }],
        },
      })
      .subLocation(
        location<RoleName>('/data-access', ['aggregate-repository', 'query-model-loader'], {
          dependencyRules: {
            locations: [
              { location: '/domain' },
              { location: '/queries' },
              { location: '/infra/external-clients/{client}' },
            ],
          },
        }).subLocation('/extraction-project', []),
      )
      .subLocation('/domain', domainRoles, {
        allowAnySubLocations: true,
        dependencyRules: { locations: [{ location: '/domain' }] },
      })
      .subLocation(
        location<RoleName>('/entrypoint', [], {
          dependencyRules: {
            locations: [
              { location: '/commands' },
              { location: '/queries' },
              { location: '/infra/cli/*' },
            ],
          },
        })
          .subLocation(
            location<RoleName>('/_platform', entrypointRoles, {
              dependencyRules: { importableFrom: 'withinParentLocation' },
            }).subLocation('/cli', []),
          )
          .subLocation('/{entrypoint}', entrypointRoles),
      )
      .subLocation('/queries', queryRoles, {
        dependencyRules: {
          locations: [{ location: '/domain' }, { location: '/data-access' }],
        },
      }),

    location<RoleName>('/platform')
      .subLocation('/adapters/{adapter}', ['domain-port-adapter'], {
        dependencyRules: {
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
      .subLocation(
        location<RoleName>('/infra', [], {
          dependencyRules: { locations: [] },
        })
          .subLocation('/external-clients/{client}', externalClientRoles)
          .subLocation(
            location<RoleName>('/cli', [])
              .subLocation('/input', ['generic-cli-input-parser'])
              .subLocation('/presentation', cliPresentationRoles),
          ),
      ),

    location<RoleName>('/shell', ['main', 'cli-error-handler'], {
      dependencyRules: {
        locations: [
          { location: '/commands' },
          { location: '/queries' },
          { location: '/entrypoint' },
          { location: '/data-access' },
          { location: '/adapters/{adapter}' },
          { location: '/infra' },
        ],
      },
    }),
  ),
}
