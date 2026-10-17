import {
  location,
  locationConfiguration,
} from '@living-architecture/riviere-role-enforcement-domain-model'
import type { RoleName } from '../roles'

const entrypointRoles: RoleName[] = [
  'cli-entrypoint',
  'cli-entrypoint-dependencies',
  'cli-output-formatter',
  'cli-response-writer',
  'command-input-factory',
  'command-input-factory-dependencies',
  'command-input-factory-input',
  'entrypoint-cli-input-parser',
  'entrypoint-cli-input-parser-dependencies',
  'entrypoint-cli-input-parser-input',
]
const entrypointPlatformCliRoles: RoleName[] = [
  'entrypoint-cli-input-parser',
  'entrypoint-cli-input-parser-dependencies',
  'cli-output-formatter',
]
const cliPresentationRoles: RoleName[] = [
  'cli-error',
  'cli-output',
  'cli-output-formatter',
  'cli-response-formatter',
  'cli-response-writer',
  'cli-error-handler',
]
const shellRoles: RoleName[] = ['main', 'cli-error-handler']
const mastraRoles: RoleName[] = ['domain-error', 'workflow-definition', 'workspace-configuration']
const mastraAgentRoles: RoleName[] = ['agent-configuration']
const externalClientRoles: RoleName[] = [
  'external-client-service',
  'external-client-model',
  'external-client-error',
]

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
          anySubdomain: ['commands', 'queries', 'external-clients'],
        },
      },
    }),

    location('/infra', {
      'cli/presentation': cliPresentationRoles,
      'external-clients/{client}': externalClientRoles,
      importRules: { allow: {} },
    }),

    location('/mastra', mastraRoles, {
      agents: {
        roles: mastraAgentRoles,
        '{agent}': mastraAgentRoles,
        importRules: { allow: { sibling: ['tools'] } },
      },
      tools: {
        roles: mastraAgentRoles,
        importRules: { allow: {} },
      },
      workflows: {
        roles: mastraRoles,
        importRules: { allow: {} },
      },
      importRules: {
        allow: {
          root: ['infra'],
          anySubdomain: ['commands', 'queries', 'adapters', 'external-clients', 'domain'],
        },
      },
    }),

    location('/shell', shellRoles, {
      importRules: {
        allow: {
          root: ['features', 'infra', 'mastra'],
          anySubdomain: [
            'commands',
            'queries',
            'data-access',
            'adapters',
            'external-clients',
            'domain',
          ],
        },
      },
    }),
  ),
}
