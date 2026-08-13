import { location, locationConfiguration } from '@living-architecture/riviere-role-enforcement'
import type { RoleName } from '../roles'
import { domainRoles } from './location-roles'

// Package-level rules mean domain-model can import only published-language packages.
export const domainModel = {
  packageType: 'domain-model',
  locations: locationConfiguration<RoleName>(
    location('/domain', domainRoles, {
      allowAnySubLocations: true,
    }),
  ),
}
