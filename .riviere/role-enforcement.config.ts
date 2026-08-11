import { roleEnforcement } from '@living-architecture/riviere-role-enforcement'
import { allRoles, type RoleName } from './roles'

/**
 * Executable enforcement of:
 * docs/architecture/adr/ADR-002-allowed-folder-structures.md
 *
 * ADR-002 and this configuration must remain aligned.
 * Any change to the architecture must update both.
 */

const commandRoles: RoleName[] = [
  'command-use-case',
  'command-use-case-input',
  'command-use-case-result',
  'command-use-case-result-value',
  'command-input-factory',
]

const queryRoles: RoleName[] = [
  'query-model-use-case',
  'query-model-use-case-input',
  'query-model',
  'query-model-error',
]

const domainRoles: RoleName[] = [
  'aggregate',
  'value-object',
  'domain-event',
  'domain-port',
  'domain-service',
  'domain-error',
]

const externalClientRoles: RoleName[] = [
  'external-client-service',
  'external-client-model',
  'external-client-error',
]

const entrypointRoles: RoleName[] = [
  'cli-entrypoint',
  'cli-error-handler',
  'cli-output-formatter',
  'command-input-factory',
  'entrypoint-cli-input-parser',
]

const cliPresentationRoles: RoleName[] = [
  'cli-error',
  'cli-error-handler',
  'cli-output-formatter',
  'cli-response-formatter',
  'cli-response-writer',
]

const packages = [
  'packages/riviere-cli',
  'packages/riviere-extract-ts',
  'packages/riviere-builder',
  'packages/riviere-query',
  'packages/riviere-role-enforcement',
  'tools/dev-workflow-v2',
]

export const config = roleEnforcement({
  packages,
  ignorePatterns: [
    '**/__fixtures__/**',
    '**/*-fixtures.ts',
    '**/test-fixtures.ts',
    '**/test-fixture-*.ts',
  ],
  importAliases: { '@/': 'apps/eclair/src/' },
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: allRoles,
  workspacePackageSources: {
    '@living-architecture/riviere-builder': 'packages/riviere-builder/src/index.ts',
    '@living-architecture/riviere-query': 'packages/riviere-query/src/index.ts',
  },

  additionalLocationEnforcement: [
    {
      packages: ['apps/eclair'],
      locations: {
        source: {
          path: 'src',
          subLocations: {
            assets: { allowAnySubLocations: true },
            features: {
              subLocations: {
                '{feature}': {
                  subLocations: {
                    components: { allowAnySubLocations: true },
                    domain: {
                      allowAnySubLocations: true,
                      rules: {
                        dependencyRules: {
                          locations: [{ location: 'domain' }],
                        },
                      },
                    },
                    entrypoint: {},
                    hooks: {},
                    queries: {},
                  },
                  rules: { dependencyRules: { canImportSiblings: false } },
                },
              },
            },
            platform: {
              subLocations: {
                domain: {
                  allowAnySubLocations: true,
                  rules: { dependencyRules: { locations: [{ location: 'domain' }] } },
                },
                infra: {
                  subLocations: {
                    export: {},
                    'file-upload': { allowAnySubLocations: true },
                    layout: {},
                    presentation: { allowAnySubLocations: true },
                    settings: {},
                  },
                  rules: { dependencyRules: { locations: [] } },
                },
              },
            },
            shell: { allowAnySubLocations: true },
            test: { allowAnySubLocations: true },
          },
        },
      },
    },
  ],

  locations: {
    source: {
      path: 'src',
      subLocations: {
        features: {
          subLocations: {
            '{feature}': {
              subLocations: {
                adapters: {
                  subLocations: {
                    '{adapter}': {
                      rules: {
                        roles: ['domain-port-adapter'],
                        dependencyRules: {
                          externalPackages: [],
                          locations: [
                            { location: 'domain', roles: ['domain-port'] },
                            { location: 'external-clients', roles: externalClientRoles },
                          ],
                        },
                      },
                    },
                  },
                },
                commands: { rules: { roles: commandRoles } },
                'data-access': {
                  subLocations: { 'extraction-project': {} },
                  rules: { roles: ['aggregate-repository', 'query-model-loader'] },
                },
                domain: {
                  allowAnySubLocations: true,
                  rules: {
                    roles: domainRoles,
                    dependencyRules: {
                      locations: [{ location: 'domain' }],
                    },
                  },
                },
                entrypoint: {
                  subLocations: {
                    _platform: {
                      subLocations: { cli: {} },
                      rules: {
                        roles: entrypointRoles,
                        dependencyRules: { importableFrom: 'withinParentLocation' },
                      },
                    },
                    '{entrypoint}': { rules: { roles: entrypointRoles } },
                  },
                },
                queries: { rules: { roles: queryRoles } },
              },
              rules: { dependencyRules: { canImportSiblings: false } },
            },
          },
        },
        platform: {
          subLocations: {
            adapters: {
              subLocations: {
                '{adapter}': {
                  rules: {
                    roles: ['domain-port-adapter'],
                    dependencyRules: {
                      externalPackages: [],
                      locations: [
                        { location: 'domain', roles: ['domain-port'] },
                        { location: 'external-clients', roles: externalClientRoles },
                      ],
                    },
                  },
                },
              },
            },
            domain: {
              allowAnySubLocations: true,
              rules: {
                roles: domainRoles,
                dependencyRules: { locations: [{ location: 'domain' }] },
              },
            },
            infra: {
              subLocations: {
                cli: {
                  subLocations: {
                    input: { rules: { roles: ['generic-cli-input-parser'] } },
                    presentation: { rules: { roles: cliPresentationRoles } },
                  },
                },
                'external-clients': {
                  subLocations: {
                    '{client}': { rules: { roles: externalClientRoles } },
                  },
                },
              },
              rules: { dependencyRules: { locations: [] } },
            },
          },
        },
        shell: { rules: { roles: ['main', 'cli-error-handler'] } },
      },
    },
  },
})
