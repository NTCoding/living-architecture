import { roleEnforcementConfiguration } from '@living-architecture/riviere-role-enforcement'
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

export const config = roleEnforcementConfiguration({
  configurations: {
    'apps/': app,
    'packages/{subdomain}/domain-model': domainModel,
    'packages/{subdomain}/published-language': publishedLanguage,
    'packages/{subdomain}/use-cases': useCases,
    'tools/{tool}/app': app,
    'tools/{tool}/domain-model': domainModel,
    'tools/{tool}/use-cases': useCases,
  },
  ignorePatterns: [
    '**/__fixtures__/**',
    '**/*-fixtures.ts',
    '**/test-fixtures.ts',
    '**/test-fixture-*.ts',
  ],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: allRoles,
  unassignedPackages: ['apps/docs', 'apps/eclair'],
})
