import { roleEnforcement } from '@living-architecture/riviere-role-enforcement'
import { standard } from './configurations/standard'
import { allRoles } from './roles'

/**
 * Executable enforcement of:
 * docs/architecture/adr/ADR-002-allowed-folder-structures.md
 *
 * ADR-002 and this configuration must remain aligned.
 * Any change to the architecture must update both.
 */

export const config = roleEnforcement({
  configurations: { standard },
  ignorePatterns: [
    '**/__fixtures__/**',
    '**/*-fixtures.ts',
    '**/test-fixtures.ts',
    '**/test-fixture-*.ts',
  ],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: allRoles,
  workspacePackageSources: {
    '@living-architecture/riviere-builder': 'packages/riviere-builder/src/index.ts',
    '@living-architecture/riviere-query': 'packages/riviere-query/src/index.ts',
  },
})
