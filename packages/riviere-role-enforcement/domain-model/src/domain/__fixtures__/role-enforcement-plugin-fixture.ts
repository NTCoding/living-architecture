import { Linter } from 'eslint'
import { parser } from 'typescript-eslint'
import plugin from '@living-architecture/riviere-role-enforcement-domain-model/plugin'
import { location, locationConfiguration, role, RoleEnforcementConfiguration } from '../../index'

const commandInputFactory = role('command-input-factory', {
  forbiddenImportedFunctionCalls: true,
  targets: ['function'],
})

const cliInputParser = role('entrypoint-cli-input-parser', {
  allowedInputs: ['entrypoint-cli-input-parser-input'],
  allowsUnclassifiedInputs: true,
  forbiddenImportedFunctionCalls: true,
  nameMatches: '^parse',
  targets: ['function'],
})

const cliInputParserInput = role('entrypoint-cli-input-parser-input', {
  targets: ['interface'],
})

const cliInputParserDependencies = role('entrypoint-cli-input-parser-dependencies', {
  forbiddenInlineCallableMembers: true,
  nameMatches: '.*CliInputParserDependencies$',
  targets: ['interface'],
})

const cliEntrypoint = role('cli-entrypoint', {
  allowedInputs: ['cli-entrypoint-dependencies'],
  forbiddenDependencies: ['cli-entrypoint'],
  forbiddenImportedFunctionCalls: true,
  targets: ['function'],
})

const cliEntrypointDependencies = role('cli-entrypoint-dependencies', {
  forbiddenInlineFunctionImplementations: true,
  nameMatches: '.*EntrypointDependencies$',
  requiresRoleDependencies: true,
  targets: ['interface'],
})

const aggregate = role('aggregate', { targets: ['class'] })

const aggregateRepository = role('aggregate-repository', {
  allowedOutputs: ['aggregate'],
  outputMethodNameMatches: '^load(?:By[A-Z][A-Za-z0-9]*)?$',
  targets: ['class'],
})

const config = RoleEnforcementConfiguration.parse({
  configurations: {
    'packages/example': {
      locations: locationConfiguration(
        location('/entrypoint', [
          'command-input-factory',
          'entrypoint-cli-input-parser',
          'entrypoint-cli-input-parser-input',
          'entrypoint-cli-input-parser-dependencies',
          'cli-entrypoint',
          'cli-entrypoint-dependencies',
          'aggregate',
          'aggregate-repository',
        ]),
      ),
    },
  },
  ignorePatterns: [],
  roleDefinitionsDir: '.riviere/role-definitions',
  roles: [
    commandInputFactory,
    cliInputParser,
    cliInputParserInput,
    cliInputParserDependencies,
    cliEntrypoint,
    cliEntrypointDependencies,
    aggregate,
    aggregateRepository,
  ],
})

export function enforce(
  source: string,
  options: { configDir?: string; filename?: string } = {},
): ReturnType<Linter['verify']> {
  return enforceWithRule(plugin.rules['enforce-roles'], source, options)
}

export function enforceWithoutPluginRule(): ReturnType<Linter['verify']> {
  return enforceWithRule(undefined, '', {})
}

function enforceWithRule(
  enforceRolesRule: Parameters<Linter['defineRule']>[1] | undefined,
  source: string,
  options: { configDir?: string; filename?: string },
): ReturnType<Linter['verify']> {
  const configDir = options.configDir ?? '/workspace'
  const linter = new Linter({ configType: 'eslintrc' })
  if (enforceRolesRule === undefined) {
    return []
  }
  linter.defineRule('enforce-roles', enforceRolesRule)
  linter.defineParser('typescript', parser)

  return linter.verify(
    source,
    {
      parser: 'typescript',
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      rules: {
        'enforce-roles': [
          'error',
          {
            configDir,
            configDisplayPath: '.riviere/roles.ts',
            locationHierarchy: config.locationHierarchy,
            roleDefinitionsDir: config.roleDefinitionsDir,
            roles: config.roles,
          },
        ],
      },
    },
    { filename: options.filename ?? '/workspace/packages/example/src/entrypoint/input.ts' },
  )
}
