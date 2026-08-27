import {
  location,
  locationConfiguration,
} from '@living-architecture/riviere-role-enforcement-domain-model'
import type { RoleName } from '../roles'

const domainRoles: RoleName[] = [
  'aggregate',
  'aggregate-entity',
  'value-object',
  'domain-event',
  'domain-port',
  'domain-service',
  'domain-facade',
  'domain-error',
]

// A domain model cannot import another domain model or any app or use-case layer.
export const domainModel = {
  locations: locationConfiguration<RoleName>(
    location('/domain', domainRoles, {
      allowAnySubLocations: true,
      importRules: {
        allow: { anySubdomain: ['published-language'] },
      },
    }),
  ),
  packageManifest: {
    requiredNonEmptyStringProperties: ['description'],
  },
}
