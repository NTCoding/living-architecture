import { location, locationConfiguration } from '@living-architecture/riviere-role-enforcement'
import type { RoleName } from '../roles'
import {
  cliPresentationRoles,
  commandRoles,
  domainRoles,
  entrypointRoles,
  externalClientRoles,
  queryRoles,
} from './location-roles'

export const app = {
  packages: ['packages/riviere-cli', 'packages/riviere-role-enforcement', 'tools/dev-workflow-v2'],
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
            {
              location: '**/platform/infra/external-clients/{client}',
              roles: externalClientRoles,
            },
          ],
        },
      })
      .subLocation('/commands', commandRoles, {
        dependencyRules: {
          locations: [
            { location: '/domain' },
            { location: '/data-access' },
            { location: '**/data-access' },
            { location: '**/domain' },
            { location: '**/published-language' },
            { location: '**/platform/domain' },
          ],
        },
      })
      .subLocation(
        '/data-access/{concept}',
        ['aggregate-repository', 'query-model-loader', 'data-access-error'],
        {
          dependencyRules: {
            locations: [
              { location: '/domain', roles: ['aggregate', 'value-object'] },
              { location: '**/domain', roles: ['aggregate', 'value-object'] },
              { location: '**/published-language' },
              { location: '/queries' },
              { location: '/infra/external-clients/{client}' },
              { location: '**/platform/infra/external-clients/{client}' },
            ],
          },
        },
      )
      .subLocation('/domain', domainRoles, {
        allowAnySubLocations: true,
        dependencyRules: {
          locations: [{ location: '**/platform/domain' }, { location: '**/published-language' }],
        },
      })
      .subLocation(
        location<RoleName>('/entrypoint', [], {
          dependencyRules: {
            locations: [
              { location: '/commands' },
              { location: '/queries' },
              { location: '**/platform/infra/cli/*' },
            ],
          },
        })
          .subLocation(
            location<RoleName>('/_platform', [], {
              dependencyRules: { importableFrom: 'withinParentLocation' },
            }).subLocation('/cli', ['entrypoint-cli-input-parser', 'cli-output-formatter']),
          )
          .subLocation('/{entrypoint}', entrypointRoles),
      )
      .subLocation('/queries', queryRoles, {
        dependencyRules: {
          locations: [
            { location: '/domain' },
            { location: '/data-access' },
            { location: '**/domain' },
            { location: '**/published-language' },
            { location: '**/platform/domain' },
          ],
        },
      }),

    location<RoleName>('/data-access/{concept}', ['aggregate-repository', 'data-access-error'], {
      dependencyRules: {
        locations: [
          { location: '**/domain', roles: ['aggregate', 'value-object'] },
          { location: '**/published-language' },
          { location: '/platform/infra/external-clients/{client}' },
        ],
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
        dependencyRules: { locations: [] },
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
          { location: '**/features/{feature}/commands' },
          { location: '**/features/{feature}/queries' },
          { location: '**/features/{feature}/entrypoint' },
          { location: '**/features/{feature}/data-access' },
          { location: '**/features/{feature}/adapters' },
          {
            location: '**/features/{feature}/domain',
            roles: ['domain-service', 'value-object'],
          },
          { location: '**/platform/infra' },
        ],
      },
    }),
  ),
}
