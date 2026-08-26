import { RoleEnforcementConfiguration } from '@living-architecture/riviere-role-enforcement-domain-model'
import { app } from './configurations/app'
import { domainModel } from './configurations/domain-model'
import { publishedLanguage } from './configurations/published-language'
import { useCases } from './configurations/use-cases'
import { allRoles } from './roles'

/**
 * Executable enforcement of:
 * docs/architecture/adr/ADR-002-allowed-folder-structures.md
 *
 * ADR-002 and this configuration must remain aligned.
 * Any change to the architecture must update both.
 */

export const config = RoleEnforcementConfiguration.parse({
  configurations: {
    'apps/': app,
    'packages/{subdomain}/domain-model': domainModel,
    'packages/{subdomain}/published-language': publishedLanguage,
    'packages/{subdomain}/use-cases': useCases,
    'tools/': app,
  },
  ignorePatterns: ['**/__fixtures__/**'],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: allRoles,
  unassignedPackages: ['apps/docs', 'apps/eclair'],
})
