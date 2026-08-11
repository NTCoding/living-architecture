import { location, locationConfiguration } from '@living-architecture/riviere-role-enforcement'
import type { RoleName } from '../roles'

export const commandRoles: RoleName[] = [
  'command-use-case',
  'command-use-case-input',
  'command-use-case-result',
  'command-use-case-result-value',
  'command-input-factory',
]

export const queryRoles: RoleName[] = [
  'query-model-use-case',
  'query-model-use-case-input',
  'query-model',
  'query-model-error',
]

export const domainRoles: RoleName[] = [
  'aggregate',
  'value-object',
  'domain-event',
  'domain-port',
  'domain-service',
  'domain-error',
]

export const externalClientRoles: RoleName[] = [
  'external-client-service',
  'external-client-model',
  'external-client-error',
]

export const entrypointRoles: RoleName[] = [
  'cli-entrypoint',
  'cli-error-handler',
  'cli-output-formatter',
  'command-input-factory',
  'entrypoint-cli-input-parser',
]

export const cliPresentationRoles: RoleName[] = [
  'cli-error',
  'cli-error-handler',
  'cli-output-formatter',
  'cli-response-formatter',
  'cli-response-writer',
]

export const common = locationConfiguration(
  location<RoleName>('src'),

  location<RoleName>('src/features/{feature}', {
    dependencyRules: { canImportSiblings: false },
  })
    .subLocation('/domain', domainRoles, {
      allowAnySubLocations: true,
      dependencyRules: { locations: [{ location: '/domain' }] },
    })
    .subLocation('/entrypoint', [])
    .subLocation('/queries', []),

  location<RoleName>('src/platform')
    .subLocation('/domain', domainRoles, {
      allowAnySubLocations: true,
      dependencyRules: { locations: [{ location: '/domain' }] },
    })
    .subLocation('/infra', [], {
      dependencyRules: { locations: [] },
    }),

  location<RoleName>('src/shell', ['main', 'cli-error-handler']),
)
