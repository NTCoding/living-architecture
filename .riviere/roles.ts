import { role } from '@living-architecture/riviere-role-enforcement-domain-model'

export const publishedLanguageRoles = [
  'domain-error',
  'published-language-annotation',
  'published-language-schema',
  'published-language-data-structure',
  'published-language-enumeration',
  'published-language-enumeration-type',
  'published-language-union',
  'published-language-parser',
  'published-language-field-name',
  'value-object',
] as const

export const allRoles = [
  role('cli-entrypoint', {
    targets: ['function'],
    allowedInputs: ['cli-entrypoint-dependencies'],
    forbiddenDependencies: ['cli-entrypoint'],
    forbiddenImportedFunctionCalls: true,
  }),
  role('cli-entrypoint-dependencies', {
    allowedCollaboratorRoles: [
      'cli-error-handler',
      'cli-output-formatter',
      'cli-response-formatter',
      'cli-response-writer',
      'command-input-factory',
      'command-use-case',
      'entrypoint-cli-input-parser',
      'query-model-use-case',
    ],
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
  role('cli-response-writer', {
    targets: ['function'],
    allowedInputs: ['command-use-case-result', 'query-model'],
  }),
  role('cli-error-handler', { targets: ['function'] }),
  role('command-input-factory', {
    targets: ['function'],
    allowedInputs: ['command-input-factory-input', 'command-input-factory-dependencies'],
    allowsUnclassifiedInputs: true,
    allowedOutputs: ['command-use-case-input'],
    forbiddenImportedFunctionCalls: true,
    allowedDependencyRoles: ['cli-error', 'command-use-case-input'],
  }),
  role('command-input-factory-input', {
    targets: ['interface'],
    mustBeDataStructure: true,
  }),
  role('command-input-factory-dependencies', {
    targets: ['interface'],
    forbiddenInlineCallableMembers: true,
    allowedDependencyRoles: [],
  }),
  role('external-client-service', { targets: ['function', 'class'] }),
  role('aggregate-repository', {
    targets: ['class'],
    allowedOutputs: ['aggregate'],
    outputMethodNameMatches: '^load(?:By[A-Z][A-Za-z0-9]*)?$',
    forbiddenOutputMethodNameMatches: '^loadByEnrichment$',
    forbiddenDependencies: ['aggregate-repository'],
  }),
  role('data-access-error', { targets: ['class'] }),
  role('aggregate', {
    targets: ['interface', 'type-alias', 'class'],
    minPublicMethods: 1,
    requiresPrivateDataMembers: true,
    approvedInstances: [
      {
        name: 'RiviereProject',
        userHasApproved: true,
      },
      {
        name: 'RoleEnforcementProject',
        userHasApproved: true,
      },
      {
        name: 'MaintainerWorkflow',
        userHasApproved: true,
      },
    ],
  }),
  role('aggregate-entity', {
    targets: ['class'],
    allowedDependentRoles: ['aggregate'],
    requiresPrivateConstructor: true,
    requiresDataMembers: true,
    requiresPrivateDataMembers: true,
  }),
  role('value-object', {
    targets: ['class'],
    forbiddenCallableDataMembers: true,
    forbiddenSupertypes: ['Error'],
    requiredPrivateMembers: ['brand'],
    requiresPrivateConstructor: true,
    requiredStaticFactoryMethodNamePrefixes: ['parse', 'from'],
    requiresStaticFactoryMethodParameters: true,
    requiresDataMembers: true,
    forbiddenDependencies: ['aggregate', 'domain-service'],
  }),
  role('domain-error', { targets: ['class'] }),
  role('domain-event', {
    targets: ['type-alias'],
    mustBeDataStructure: true,
  }),
  role('domain-port', {
    targets: ['interface', 'type-alias'],
    requiresJustification:
      'If the aggregate using this port loads any data through it, explain why that data is not previously created aggregate state that its repository should load as part of the aggregate.',
  }),
  role('domain-service', {
    targets: ['function', 'class'],
    forbiddenDependencies: ['domain-service'],
    requiresJustification:
      'If this behaviour operates on aggregate or value object state, explain why it should not be a method on the object that owns that state. Otherwise, explain why no aggregate or value object is the natural owner.',
  }),
  role('domain-facade', {
    targets: ['class'],
    allowedDependencyRoles: ['domain-service', 'domain-error', ...publishedLanguageRoles],
    allowedDependentRoles: ['command-use-case', 'query-model', 'query-model-value'],
    approvedInstances: [
      {
        name: 'RiviereQuery',
        userHasApproved: true,
      },
    ],
    requiresPrivateDataMembers: true,
    requiresReadonlyDataMembers: true,
    requiresJustification:
      'Which types of consumers need this facade, and why do they need one stable domain interface over these related capabilities instead of using the capabilities directly?',
  }),
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
    nameMatches: '^parse',
    allowedInputs: [
      'entrypoint-cli-input-parser-input',
      'entrypoint-cli-input-parser-dependencies',
    ],
    allowsUnclassifiedInputs: true,
    forbiddenImportedFunctionCalls: true,
    allowedDependencyRoles: ['cli-error', 'command-use-case-input'],
  }),
  role('entrypoint-cli-input-parser-input', {
    targets: ['interface'],
    mustBeDataStructure: true,
  }),
  role('entrypoint-cli-input-parser-dependencies', {
    forbiddenInlineCallableMembers: true,
    targets: ['interface'],
    allowedDependencyRoles: [],
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
  role('published-language-enumeration', {
    targets: ['variable'],
    nameMatches: '^[A-Z][A-Z0-9_]*$',
  }),
  role('published-language-enumeration-type', {
    targets: ['type-alias'],
    requiresIndexedAccessTypeFromRole: 'published-language-enumeration',
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
