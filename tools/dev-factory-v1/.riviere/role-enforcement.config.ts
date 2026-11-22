import { RoleEnforcementConfiguration } from '@living-architecture/riviere-role-enforcement-domain-model'
import { app } from './configurations/app'
import { domainModel } from './configurations/domain-model'
import { useCases } from './configurations/use-cases'
import { allRoles } from './roles'

/**
 * Executable enforcement of:
 * docs/adr/ADR-001-allowed-folder-structures.md
 *
 * ADR-001 and this configuration must remain aligned.
 * Any change to the architecture must update both.
 */

export const config = RoleEnforcementConfiguration.parse({
  configurations: {
    '{subdomain}/domain-model': domainModel,
    '{subdomain}/use-cases': useCases,
    server: app,
  },
  ignorePatterns: ['**/__fixtures__/**'],
  importAliases: {
    '@dev-factory-v1/domain-model/': 'software-factory/domain-model/src',
    '@dev-factory-v1/use-cases/': 'software-factory/use-cases/src',
  },
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: allRoles,
  unassignedPackages: ['ui'],
})
