import { createRoleFactory } from '@living-architecture/riviere-role-enforcement'

type RoleName =
  | 'aggregate'
  | 'aggregate-repository'
  | 'cli-entrypoint'
  | 'cli-error'
  | 'cli-input-validator'
  | 'cli-output-formatter'
  | 'command-input-factory'
  | 'command-use-case'
  | 'command-use-case-input'
  | 'command-use-case-result'
  | 'command-use-case-result-value'
  | 'domain-error'
  | 'domain-service'
  | 'external-client-error'
  | 'external-client-model'
  | 'external-client-service'
  | 'main'
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
    forbiddenDependencies: ['command-use-case'],
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
  role('command-input-factory', {
    targets: ['function'],
    allowedOutputs: ['command-use-case-input'],
  }),
  role('external-client-service', { targets: ['function'] }),
  role('aggregate-repository', {
    targets: ['class'],
    allowedOutputs: ['aggregate', 'domain-error'],
    forbiddenDependencies: ['aggregate-repository'],
  }),
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
    ],
  }),
  role('value-object', { targets: ['interface', 'type-alias', 'class'] }),
  role('domain-error', { targets: ['class'] }),
  role('domain-service', { targets: ['function', 'class'] }),
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
    allowedOutputs: ['query-model', 'domain-error'],
    forbiddenDependencies: ['query-model-loader'],
  }),
  role('external-client-model', { targets: ['interface', 'type-alias', 'class'] }),
  role('external-client-error', { targets: ['class'] }),
  role('cli-input-validator', { targets: ['function'] }),
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
] as const

export type { RoleName }
