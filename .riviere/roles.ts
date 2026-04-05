import { role } from '@living-architecture/riviere-role-enforcement'

export const allRoles = [
  role('cli-entrypoint', { targets: ['function'] }),
  role('command-use-case', {
    targets: ['function'],
    allowedInputs: ['command-use-case-input'],
    allowedOutputs: ['command-use-case-result'],
    forbiddenDependencies: ['command-use-case'],
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
        name: 'BuilderFacade',
        userHasApproved: true,
      },
    ],
  }),
  role('value-object', { targets: ['interface', 'type-alias', 'class'] }),
  role('domain-error', { targets: ['class'] }),
  role('domain-service', { targets: ['function'] }),
  role('query-use-case', {
    targets: ['function'],
    allowedInputs: ['query-use-case-input'],
    allowedOutputs: ['query-use-case-result'],
    forbiddenDependencies: ['query-use-case'],
  }),
  role('query-use-case-input', {
    targets: ['interface', 'type-alias'],
    nameMatches: '.*Input$',
  }),
  role('query-use-case-result', {
    targets: ['interface', 'type-alias'],
    nameMatches: '.*Result$',
  }),
  role('query-use-case-result-value', { targets: ['interface', 'type-alias'] }),
  role('query-model', {
    targets: ['class'],
    minPublicMethods: 1,
  }),
  role('query-model-loader', {
    targets: ['class'],
    allowedOutputs: ['query-model', 'domain-error'],
    forbiddenDependencies: ['query-model-loader'],
  }),
  role('external-client-model', { targets: ['interface', 'type-alias', 'class'] }),
  role('external-client-error', { targets: ['class'] }),
  role('cli-input-validator', { targets: ['function'] }),
  role('cli-error', { targets: ['class'] }),
  role('main', { targets: ['function'] }),
] as const

export type RoleName = (typeof allRoles)[number]['name']
