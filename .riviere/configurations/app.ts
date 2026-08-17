import {
  location,
  locationConfiguration,
} from '@living-architecture/riviere-role-enforcement-domain-model'
import type { RoleName } from '../roles'

const entrypointRoles: RoleName[] = [
  'cli-entrypoint',
  'cli-entrypoint-dependencies',
  'cli-output-formatter',
  'command-input-factory',
  'entrypoint-cli-input-parser',
  'entrypoint-cli-input-parser-dependencies',
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
      // Features cannot import from each other. They can only import root infra and commands or queries from any subdomain.
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
