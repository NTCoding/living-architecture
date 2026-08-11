import { location } from '@living-architecture/riviere-role-enforcement'
import type { RoleName } from '../roles'
import {
  cliPresentationRoles,
  commandRoles,
  common,
  entrypointRoles,
  externalClientRoles,
  queryRoles,
} from './common'

export const standard = {
  packages: [
    'packages/riviere-cli',
    'packages/riviere-extract-ts',
    'packages/riviere-builder',
    'packages/riviere-query',
    'packages/riviere-role-enforcement',
    'tools/dev-workflow-v2',
  ],
  locations: common.extend(
    location<RoleName>('src/features/{feature}')
      .subLocation('/adapters/{adapter}', ['domain-port-adapter'], {
        dependencyRules: {
          externalPackages: [],
          locations: [
            { location: '/domain', roles: ['domain-port'] },
            {
              location: '/infra/external-clients/{client}',
              roles: externalClientRoles,
            },
          ],
        },
      })
      .subLocation('/commands', commandRoles)
      .subLocation('/data-access', ['aggregate-repository', 'query-model-loader'])
      .subLocation('/data-access/extraction-project', [])
      .subLocation('/entrypoint/_platform', entrypointRoles, {
        dependencyRules: { importableFrom: 'withinParentLocation' },
      })
      .subLocation('/entrypoint/_platform/cli', [])
      .subLocation('/entrypoint/{entrypoint}', entrypointRoles)
      .subLocation('/queries', queryRoles),

    location<RoleName>('src/platform')
      .subLocation('/adapters/{adapter}', ['domain-port-adapter'], {
        dependencyRules: {
          externalPackages: [],
          locations: [
            { location: '/domain', roles: ['domain-port'] },
            {
              location: '/infra/external-clients/{client}',
              roles: externalClientRoles,
            },
          ],
        },
      })
      .subLocation('/infra/external-clients/{client}', externalClientRoles)
      .subLocation('/infra/cli/input', ['generic-cli-input-parser'])
      .subLocation('/infra/cli/presentation', cliPresentationRoles),
  ),
}
