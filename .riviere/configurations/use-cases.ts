import { location, locationConfiguration } from '@living-architecture/riviere-role-enforcement'
import type { RoleName } from '../roles'

// #region Roles
const commandRoles: RoleName[] = [
  'command-use-case',
  'command-use-case-input',
  'command-use-case-result',
  'command-use-case-result-value',
]
const queryRoles: RoleName[] = [
  'query-model-use-case',
  'query-model-use-case-input',
  'query-model',
  'query-model-error',
]
const dataAccessRoles: RoleName[] = [
  'aggregate-repository',
  'query-model-loader',
  'data-access-error',
]
const adapterRoles: RoleName[] = ['domain-port-adapter']
const externalClientRoles: RoleName[] = [
  'external-client-service',
  'external-client-model',
  'external-client-error',
]
// #endregion

export const useCases = {
  locations: locationConfiguration<RoleName>(
    location('/features/{feature}', {
      commands: {
        roles: commandRoles,
        importRules: {
          allow: {
            sibling: ['data-access'],
            ownSubdomain: ['domain'],
            anySubdomain: ['published-language'],
          },
        },
      },
      queries: {
        roles: queryRoles,
        importRules: {
          allow: {
            sibling: ['data-access'],
            ownSubdomain: ['domain'],
            anySubdomain: ['published-language'],
          },
        },
      },
      'data-access/{concept}': {
        roles: dataAccessRoles,
        importRules: {
          allow: {
            sibling: ['queries'],
            root: ['infra'],
            ownSubdomain: [{ domain: ['aggregate', 'value-object'] }],
            anySubdomain: ['published-language'],
          },
        },
      },
      'adapters/{adapter}': {
        roles: adapterRoles,
        importRules: {
          allow: {
            root: ['infra'],
            ownSubdomain: [{ domain: ['domain-port'] }],
          },
        },
      },
    }),

    location('/infra', {
      'external-clients/{client}': externalClientRoles,
      importRules: { allow: {} },
    }),
  ),
}
