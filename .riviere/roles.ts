import { createRoleFactory } from '@living-architecture/riviere-role-enforcement'

type RoleName =
  | 'aggregate'
  | 'aggregate-repository'
  | 'cli-entrypoint'
  | 'cli-error'
  | 'cli-error-handler'
  | 'entrypoint-cli-input-parser'
  | 'generic-cli-input-parser'
  | 'cli-output-formatter'
  | 'cli-response-formatter'
  | 'cli-response-writer'
  | 'command-input-factory'
  | 'command-use-case'
  | 'command-use-case-input'
  | 'command-use-case-result'
  | 'command-use-case-result-value'
  | 'data-access-error'
  | 'domain-error'
  | 'domain-event'
  | 'domain-port'
  | 'domain-service'
  | 'domain-port-adapter'
  | 'external-client-error'
  | 'external-client-model'
  | 'external-client-service'
  | 'main'
  | 'published-language-annotation'
  | 'published-language-data-structure'
  | 'published-language-field-name'
  | 'published-language-parser'
  | 'published-language-schema'
  | 'published-language-union'
  | 'query-model'
  | 'query-model-error'
  | 'query-model-loader'
  | 'query-model-use-case'
  | 'query-model-use-case-input'
  | 'value-object'

const role = createRoleFactory<RoleName>()

export const allRoles = [
  role('cli-entrypoint', { targets: ['function'] }),
  role('command-use-case', {
    targets: ['class', 'function'],
    allowedInputs: ['command-use-case-input'],
    allowedOutputs: ['command-use-case-result'],
    forbiddenDependencies: ['command-use-case', 'domain-port-adapter'],
    minPublicMethods: 1,
    maxPublicMethods: 1,
  }),
  role('command-use-case-input', {
    targets: ['interface', 'type-alias'],
    nameMatches: '.*Input$',
  }),
  role('command-use-case-result', {
    targets: ['interface', 'type-alias'],
    nameMatches: '.*Result$',
  }),
  role('command-use-case-result-value', {
    targets: ['interface', 'type-alias'],
  }),
  role('cli-output-formatter', { targets: ['function'] }),
  role('cli-response-formatter', { targets: ['function'] }),
  role('cli-response-writer', { targets: ['function'] }),
  role('cli-error-handler', { targets: ['function'] }),
  role('command-input-factory', {
    targets: ['function'],
    allowedOutputs: ['command-use-case-input'],
  }),
  role('external-client-service', { targets: ['function'] }),
  role('aggregate-repository', {
    targets: ['class'],
    allowedOutputs: ['aggregate'],
    forbiddenDependencies: ['aggregate-repository'],
  }),
  role('data-access-error', { targets: ['class'] }),
  role('aggregate', {
    targets: ['interface', 'type-alias', 'class'],
    minPublicMethods: 1,
    approvedInstances: [
      {
        name: 'ExtractionProject',
        userHasApproved: true,
      },
      {
        name: 'RiviereBuilder',
        userHasApproved: true,
      },
      {
        name: 'RoleEnforcementProject',
        userHasApproved: true,
      },
    ],
  }),
  role('value-object', {
    targets: ['class'],
    forbiddenCallableDataMembers: true,
    forbiddenSupertypes: ['Error'],
    requiredPrivateMembers: ['brand'],
    requiresPrivateConstructor: true,
    requiredStaticMethodNamePrefix: 'parse',
    requiresDataMembers: true,
    forbiddenDependencies: ['aggregate', 'domain-service'],
  }),
  role('domain-error', { targets: ['class'] }),
  role('domain-event', {
    targets: ['type-alias'],
    nameMatches: '.*Event$',
  }),
  role('domain-port', { targets: ['interface', 'type-alias'] }),
  role('domain-service', { targets: ['function', 'class'] }),
  role('domain-port-adapter', {
    targets: ['function', 'class'],
    forbiddenDependencies: ['domain-port-adapter'],
  }),
  role('query-model-use-case', {
    targets: ['class'],
    allowedInputs: ['query-model-use-case-input'],
    allowedOutputs: ['query-model'],
    forbiddenDependencies: ['query-model-use-case'],
    minPublicMethods: 1,
    maxPublicMethods: 1,
  }),
  role('query-model-use-case-input', {
    targets: ['interface', 'type-alias'],
    nameMatches: '.*(Input|Options)$',
  }),
  role('query-model', {
    targets: ['class', 'function', 'interface', 'type-alias'],
  }),
  role('query-model-error', { targets: ['class'] }),
  role('query-model-loader', {
    targets: ['class'],
    allowedOutputs: ['query-model'],
    forbiddenDependencies: ['query-model-loader'],
  }),
  role('external-client-model', { targets: ['interface', 'type-alias', 'class'] }),
  role('external-client-error', { targets: ['class'] }),
  role('entrypoint-cli-input-parser', { targets: ['function'] }),
  role('generic-cli-input-parser', { targets: ['function'] }),
  role('cli-error', { targets: ['class'] }),
  role('main', {
    targets: ['function'],
    forbiddenMethodCalls: [
      'command-use-case',
      'query-model-use-case',
      'aggregate-repository',
      'query-model-loader',
    ],
  }),
  role('published-language-annotation', {
    requiresDecoratorSignature: true,
  }),
  role('published-language-data-structure', {
    requiresDataStructure: true,
  }),
  role('published-language-field-name', {
    requiresStringLiteralConstant: true,
  }),
  role('published-language-parser', {
    returns: [
      { success: true, '*': 'published-language-schema' },
      { success: false, '*': '*' },
    ],
  }),
  role('published-language-schema', {
    requiresDataStructure: true,
  }),
  role('published-language-union', {
    requiresUnion: true,
  }),
] as const

export type { RoleName }
