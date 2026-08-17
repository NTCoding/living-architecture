import { role } from '@living-architecture/riviere-role-enforcement-domain-model'

export const allRoles = [
  role('cli-entrypoint', {
    targets: ['function'],
    allowedInputs: ['cli-entrypoint-dependencies'],
    forbiddenDependencies: ['cli-entrypoint'],
    forbiddenImportedFunctionCalls: true,
  }),
  role('cli-entrypoint-dependencies', {
    forbiddenInlineFunctionImplementations: true,
    requiresRoleDependencies: true,
    targets: ['interface'],
    nameMatches: '.*EntrypointDependencies$',
  }),
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
    forbiddenSupertypes: true,
  }),
  role('command-use-case-result', {
    targets: ['interface'],
    nameMatches: '.*Result$',
    forbiddenSupertypes: true,
  }),
  role('command-use-case-result-value', {
    targets: ['interface', 'type-alias'],
    forbiddenSupertypes: true,
  }),
  role('cli-output-formatter', { targets: ['function'] }),
  role('cli-response-formatter', { targets: ['function'] }),
  role('cli-response-writer', { targets: ['function'] }),
  role('cli-error-handler', { targets: ['function'] }),
  role('command-input-factory', {
    targets: ['function'],
    allowedOutputs: ['command-use-case-input'],
    forbiddenImportedFunctionCalls: true,
  }),
  role('external-client-service', { targets: ['function', 'class'] }),
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
    mustBeDataStructure: true,
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
    allowedOutputs: ['query-model', 'query-model-value'],
    forbiddenDependencies: ['query-model-use-case'],
    minPublicMethods: 1,
    maxPublicMethods: 1,
  }),
  role('query-model-use-case-input', {
    targets: ['interface', 'type-alias'],
    nameMatches: '.*(Input|Options)$',
  }),
  role('query-model', {
    targets: ['class', 'function', 'interface'],
    forbiddenSupertypes: true,
  }),
  role('query-model-value', {
    targets: ['interface', 'type-alias'],
    forbiddenSupertypes: true,
  }),
  role('query-model-loader', {
    targets: ['class'],
    allowedOutputs: ['query-model', 'query-model-value'],
    forbiddenDependencies: ['query-model-loader'],
  }),
  role('external-client-model', { targets: ['interface', 'type-alias', 'class'] }),
  role('external-client-error', { targets: ['class'] }),
  role('entrypoint-cli-input-parser', {
    targets: ['function'],
    forbiddenImportedFunctionCalls: true,
  }),
  role('entrypoint-cli-input-parser-dependencies', {
    forbiddenInlineCallableMembers: true,
    targets: ['interface'],
    nameMatches: '.*CliInputParserDependencies$',
  }),
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
    mustBeDataStructure: true,
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
    mustBeDataStructure: true,
  }),
  role('published-language-union', {
    requiresUnion: true,
  }),
] as const

export type RoleName = (typeof allRoles)[number]['name']
