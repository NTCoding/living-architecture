import { location, locationConfiguration } from '@living-architecture/riviere-role-enforcement'
import type { RoleName } from '../roles'

// #region Roles
const entrypointRoles: RoleName[] = [
  'cli-entrypoint',
  'cli-output-formatter',
  'command-input-factory',
  'entrypoint-cli-input-parser',
]
const entrypointPlatformCliRoles: RoleName[] = [
  'entrypoint-cli-input-parser',
  'cli-output-formatter',
]
const cliPresentationRoles: RoleName[] = [
  'cli-error',
  'cli-output-formatter',
  'cli-response-formatter',
  'cli-response-writer',
]
const shellRoles: RoleName[] = ['main', 'cli-error-handler']
// #endregion

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
      // Features are isolated from each other. They may use root infra and subdomain use cases.
      importRules: {
        allow: {
          root: ['infra'],
          anySubdomain: ['commands', 'queries'],
        },
      },
    }),

    location('/infra', {
      'cli/presentation': cliPresentationRoles,
      importRules: { allow: {} },
    }),

    location('/shell', shellRoles, {
      importRules: {
        allow: {
          root: ['features', 'infra'],
          anySubdomain: ['commands', 'queries', 'data-access', 'adapters', 'external-clients'],
        },
      },
    }),
  ),
}
