import type { RoleName } from '../roles'

export const commandRoles: RoleName[] = [
  'command-use-case',
  'command-use-case-input',
  'command-use-case-result',
  'command-use-case-result-value',
  'command-input-factory',
]

export const dataAccessRoles: RoleName[] = [
  'aggregate-repository',
  'query-model-loader',
  'data-access-error',
]

export const adapterRoles: RoleName[] = ['domain-port-adapter']

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

export const entrypointPlatformCliRoles: RoleName[] = [
  'entrypoint-cli-input-parser',
  'cli-output-formatter',
]

export const genericCliInputRoles: RoleName[] = ['generic-cli-input-parser']

export const cliPresentationRoles: RoleName[] = [
  'cli-error',
  'cli-error-handler',
  'cli-output-formatter',
  'cli-response-formatter',
  'cli-response-writer',
]

export const publishedLanguageRoles: RoleName[] = [
  'published-language-annotation',
  'published-language-schema',
  'published-language-data-structure',
  'published-language-union',
  'published-language-parser',
  'published-language-field-name',
  'value-object',
]

export const shellRoles: RoleName[] = ['main', 'cli-error-handler']
