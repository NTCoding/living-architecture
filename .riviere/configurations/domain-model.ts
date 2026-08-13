import { location, locationConfiguration } from '@living-architecture/riviere-role-enforcement'
import type { RoleName } from '../roles'
import { domainRoles } from './location-roles'

export const domainModel = {
  packages: ['packages/riviere-builder', 'packages/riviere-extract-ts'],
  locations: locationConfiguration(
    location<RoleName>('/domain', domainRoles, {
      allowAnySubLocations: true,
      dependencyRules: { locations: [{ location: '**/published-language' }] },
    }),
  ),
}
