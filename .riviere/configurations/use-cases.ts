import { location, locationConfiguration } from '@living-architecture/riviere-role-enforcement'
import type { RoleName } from '../roles'
import {
  adapterRoles,
  commandRoles,
  dataAccessRoles,
  externalClientRoles,
  queryRoles,
} from './location-roles'

export const useCases = {
  packageType: 'use-cases',
  locations: locationConfiguration<RoleName>(
    location('/features/{feature}', {
      commands: {
        roles: commandRoles,
        importRules: {
          allow: {
            sibling: ['data-access'],
            ownSubdomain: ['domain'],
            otherSubdomain: ['published-language'],
          },
        },
      },
      queries: {
        roles: queryRoles,
        importRules: {
          allow: {
            sibling: ['data-access'],
            ownSubdomain: ['domain'],
            otherSubdomain: ['published-language'],
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
            otherSubdomain: ['published-language'],
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
