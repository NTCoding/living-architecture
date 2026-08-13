import { location, locationConfiguration } from '@living-architecture/riviere-role-enforcement'
import type { RoleName } from '../roles'
import {
  cliPresentationRoles,
  entrypointPlatformCliRoles,
  entrypointRoles,
  genericCliInputRoles,
  shellRoles,
} from './location-roles'

export const app = {
  locations: locationConfiguration<RoleName>(
    location('/features/{feature}', {
      entrypoint: {
        '{entrypoint}': entrypointRoles,
        _platform: {
          cli: entrypointPlatformCliRoles,
          importRules: { importableFrom: 'withinParentLocation' },
        },
      },
      importRules: {
        canImportSiblings: false,
        allow: {
          sibling: ['infra'],
          anySubdomain: ['commands', 'queries'],
        },
      },
    }),

    location('/infra', {
      'cli/input': genericCliInputRoles,
      'cli/presentation': cliPresentationRoles,
      importRules: { allow: {} },
    }),

    location('/shell', shellRoles, {
      importRules: {
        allow: {
          sibling: ['features', 'infra'],
          anySubdomain: ['commands', 'queries', 'data-access', 'adapters', 'external-clients'],
        },
      },
    }),
  ),
}
