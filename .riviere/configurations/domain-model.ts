import { location, locationConfiguration } from '@living-architecture/riviere-role-enforcement'
import type { RoleName } from '../roles'

// #region Roles
const domainRoles: RoleName[] = [
  'aggregate',
  'value-object',
  'domain-event',
  'domain-port',
  'domain-service',
  'domain-error',
]
// #endregion

// Package-level rules mean domain-model cannot import any other package or layer.
export const domainModel = {
  locations: locationConfiguration<RoleName>(
    location('/domain', domainRoles, {
      allowAnySubLocations: true,
      importRules: {
        allow: { anySubdomain: ['published-language'] },
      },
    }),
  ),
}
