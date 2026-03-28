import {
  mkdtempSync, rmSync, writeFileSync 
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  expect, it 
} from 'vitest'
import { loadRoleEnforcementConfig } from './load-role-enforcement-config'
import { RoleEnforcementConfigError } from './role-enforcement-config-error'

function createTempConfigFile(contents: string): string {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'role-enforcement-config-'))
  const configPath = path.join(tempDir, 'role-enforcement.config.json')
  writeFileSync(configPath, contents)
  return configPath
}

it('loads a valid config file', () => {
  const configPath = createTempConfigFile(
    JSON.stringify({
      ignorePatterns: ['**/*.spec.ts'],
      include: ['src/**/*.ts'],
      layers: {
        commands: {
          allowedRoles: ['command-use-case'],
          paths: ['src/**/commands'],
        },
      },
      roles: [
        {
          allowedNames: ['runThing'],
          name: 'command-use-case',
          targets: ['function'],
        },
      ],
    }),
  )

  const loadedConfig = loadRoleEnforcementConfig(configPath)

  expect(loadedConfig.config.roles).toHaveLength(1)
  expect(loadedConfig.config.layers).toHaveProperty('commands')
  expect(loadedConfig.configDir).toBe(path.dirname(configPath))

  rmSync(path.dirname(configPath), {
    force: true,
    recursive: true,
  })
})

it('allows roles without allowedNames or nameMatches', () => {
  const configPath = createTempConfigFile(
    JSON.stringify({
      ignorePatterns: [],
      include: ['src/**/*.ts'],
      layers: {
        commands: {
          allowedRoles: ['command-use-case'],
          paths: ['src/**/commands'],
        },
      },
      roles: [
        {
          name: 'command-use-case',
          targets: ['function'],
        },
      ],
    }),
  )

  const loadedConfig = loadRoleEnforcementConfig(configPath)

  expect(loadedConfig.config.roles[0]?.name).toBe('command-use-case')

  rmSync(path.dirname(configPath), {
    force: true,
    recursive: true,
  })
})

it('rejects roles declaring both allowedNames and nameMatches', () => {
  const configPath = createTempConfigFile(
    JSON.stringify({
      ignorePatterns: [],
      include: ['src/**/*.ts'],
      layers: {
        commands: {
          allowedRoles: ['command-use-case'],
          paths: ['src/**/commands'],
        },
      },
      roles: [
        {
          allowedNames: ['runThing'],
          name: 'command-use-case',
          nameMatches: '^run[A-Z].+$',
          targets: ['function'],
        },
      ],
    }),
  )

  expect(() => loadRoleEnforcementConfig(configPath)).toThrowError(
    new RoleEnforcementConfigError(
      "Invalid role enforcement config: roles.0.nameMatches: Role definition cannot declare both 'allowedNames' and 'nameMatches'.",
    ),
  )

  rmSync(path.dirname(configPath), {
    force: true,
    recursive: true,
  })
})

it('rejects invalid regular expressions in nameMatches', () => {
  const configPath = createTempConfigFile(
    JSON.stringify({
      ignorePatterns: [],
      include: ['src/**/*.ts'],
      layers: {
        commands: {
          allowedRoles: ['command-use-case'],
          paths: ['src/**/commands'],
        },
      },
      roles: [
        {
          name: 'command-use-case',
          nameMatches: '[',
          targets: ['function'],
        },
      ],
    }),
  )

  expect(() => loadRoleEnforcementConfig(configPath)).toThrowError(
    new RoleEnforcementConfigError(
      "Invalid role enforcement config: roles.0.nameMatches: '[' is not a valid regular expression.",
    ),
  )

  rmSync(path.dirname(configPath), {
    force: true,
    recursive: true,
  })
})

it('accepts forbiddenDependencies referencing defined roles', () => {
  const configPath = createTempConfigFile(
    JSON.stringify({
      ignorePatterns: [],
      include: ['src/**/*.ts'],
      layers: {
        commands: {
          allowedRoles: ['command-use-case'],
          paths: ['src/**/commands'],
        },
      },
      roles: [
        {
          forbiddenDependencies: ['command-use-case'],
          name: 'command-use-case',
          targets: ['function'],
        },
      ],
    }),
  )

  const loadedConfig = loadRoleEnforcementConfig(configPath)

  expect(loadedConfig.config.roles[0]?.forbiddenDependencies).toStrictEqual(['command-use-case'])

  rmSync(path.dirname(configPath), {
    force: true,
    recursive: true,
  })
})

it('rejects forbiddenDependencies referencing undefined roles', () => {
  const configPath = createTempConfigFile(
    JSON.stringify({
      ignorePatterns: [],
      include: ['src/**/*.ts'],
      layers: {
        commands: {
          allowedRoles: ['command-use-case'],
          paths: ['src/**/commands'],
        },
      },
      roles: [
        {
          forbiddenDependencies: ['nonexistent-role'],
          name: 'command-use-case',
          targets: ['function'],
        },
      ],
    }),
  )

  expect(() => loadRoleEnforcementConfig(configPath)).toThrowError(
    new RoleEnforcementConfigError(
      "Invalid role enforcement config: roles.0.forbiddenDependencies: 'nonexistent-role' is not a defined role.",
    ),
  )

  rmSync(path.dirname(configPath), {
    force: true,
    recursive: true,
  })
})

it('rejects layer allowedRoles referencing undefined roles', () => {
  const configPath = createTempConfigFile(
    JSON.stringify({
      ignorePatterns: [],
      include: ['src/**/*.ts'],
      layers: {
        commands: {
          allowedRoles: ['nonexistent-role'],
          paths: ['src/**/commands'],
        },
      },
      roles: [
        {
          name: 'command-use-case',
          targets: ['function'],
        },
      ],
    }),
  )

  expect(() => loadRoleEnforcementConfig(configPath)).toThrowError(
    new RoleEnforcementConfigError(
      "Invalid role enforcement config: layers.commands.allowedRoles: 'nonexistent-role' is not a defined role.",
    ),
  )

  rmSync(path.dirname(configPath), {
    force: true,
    recursive: true,
  })
})

it('rejects malformed json files', () => {
  const configPath = createTempConfigFile('{')

  expect(() => loadRoleEnforcementConfig(configPath)).toThrowError(RoleEnforcementConfigError)

  rmSync(path.dirname(configPath), {
    force: true,
    recursive: true,
  })
})

it('reports root-level schema violations', () => {
  const configPath = createTempConfigFile(
    JSON.stringify({
      extra: true,
      ignorePatterns: [],
      include: ['src/**/*.ts'],
      layers: {
        commands: {
          allowedRoles: ['command-use-case'],
          paths: ['src/**/commands'],
        },
      },
      roles: [],
    }),
  )

  expect(() => loadRoleEnforcementConfig(configPath)).toThrowError(
    new RoleEnforcementConfigError(
      'Invalid role enforcement config: $: must NOT have additional properties; roles: must NOT have fewer than 1 items',
    ),
  )

  rmSync(path.dirname(configPath), {
    force: true,
    recursive: true,
  })
})
