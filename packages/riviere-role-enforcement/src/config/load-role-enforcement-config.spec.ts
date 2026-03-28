import {
  mkdirSync, mkdtempSync, rmSync, writeFileSync 
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  expect, it 
} from 'vitest'
import { loadRoleEnforcementConfig } from './load-role-enforcement-config'
import { RoleEnforcementConfigError } from './role-enforcement-config-error'

interface RoleFixture {
  name: string
  targets: string[]
}

function createTempDir(): string {
  return mkdtempSync(path.join(tmpdir(), 'role-enforcement-config-'))
}

function writeConfig(dir: string, config: unknown): string {
  const configPath = path.join(dir, 'role-enforcement.config.json')
  writeFileSync(configPath, JSON.stringify(config))
  return configPath
}

function createRoleDefsDir(dir: string, roles: RoleFixture[], withIndex = true): void {
  const roleDefsDir = path.join(dir, 'role-definitions')
  mkdirSync(roleDefsDir)
  if (withIndex) {
    writeFileSync(path.join(roleDefsDir, 'index.md'), '# Role Definitions')
  }
  for (const role of roles) {
    writeFileSync(path.join(roleDefsDir, `${role.name}.md`), `# ${role.name}`)
  }
}

function cleanupDir(dir: string): void {
  rmSync(dir, {
    force: true,
    recursive: true,
  })
}

const commandRole: RoleFixture = {
  name: 'command-use-case',
  targets: ['function'],
}

const baseConfig = {
  ignorePatterns: [],
  include: ['src/**/*.ts'],
  layers: {
    commands: {
      allowedRoles: ['command-use-case'],
      paths: ['src/**/commands'],
    },
  },
  roleDefinitionsDir: 'role-definitions',
  roles: [commandRole],
}

it('loads a valid config file', () => {
  const tempDir = createTempDir()
  const configPath = writeConfig(tempDir, {
    ...baseConfig,
    roles: [
      {
        allowedNames: ['runThing'],
        name: 'command-use-case',
        targets: ['function'],
      },
    ],
  })
  createRoleDefsDir(tempDir, [commandRole])

  const loadedConfig = loadRoleEnforcementConfig(configPath)

  expect(loadedConfig.config.roles).toHaveLength(1)
  expect(loadedConfig.config.layers).toHaveProperty('commands')
  expect(loadedConfig.configDir).toBe(tempDir)

  cleanupDir(tempDir)
})

it('allows roles without allowedNames or nameMatches', () => {
  const tempDir = createTempDir()
  const configPath = writeConfig(tempDir, baseConfig)
  createRoleDefsDir(tempDir, [commandRole])

  const loadedConfig = loadRoleEnforcementConfig(configPath)

  expect(loadedConfig.config.roles[0]?.name).toBe('command-use-case')

  cleanupDir(tempDir)
})

it('rejects roles declaring both allowedNames and nameMatches', () => {
  const tempDir = createTempDir()
  const configPath = writeConfig(tempDir, {
    ...baseConfig,
    roles: [
      {
        allowedNames: ['runThing'],
        name: 'command-use-case',
        nameMatches: '^run[A-Z].+$',
        targets: ['function'],
      },
    ],
  })
  createRoleDefsDir(tempDir, [commandRole])

  expect(() => loadRoleEnforcementConfig(configPath)).toThrowError(
    new RoleEnforcementConfigError(
      "Invalid role enforcement config: roles.0.nameMatches: Role definition cannot declare both 'allowedNames' and 'nameMatches'.",
    ),
  )

  cleanupDir(tempDir)
})

it('rejects invalid regular expressions in nameMatches', () => {
  const tempDir = createTempDir()
  const configPath = writeConfig(tempDir, {
    ...baseConfig,
    roles: [
      {
        name: 'command-use-case',
        nameMatches: '[',
        targets: ['function'],
      },
    ],
  })
  createRoleDefsDir(tempDir, [commandRole])

  expect(() => loadRoleEnforcementConfig(configPath)).toThrowError(
    new RoleEnforcementConfigError(
      "Invalid role enforcement config: roles.0.nameMatches: '[' is not a valid regular expression.",
    ),
  )

  cleanupDir(tempDir)
})

it('accepts forbiddenDependencies referencing defined roles', () => {
  const tempDir = createTempDir()
  const configPath = writeConfig(tempDir, {
    ...baseConfig,
    roles: [
      {
        forbiddenDependencies: ['command-use-case'],
        name: 'command-use-case',
        targets: ['function'],
      },
    ],
  })
  createRoleDefsDir(tempDir, [commandRole])

  const loadedConfig = loadRoleEnforcementConfig(configPath)

  expect(loadedConfig.config.roles[0]?.forbiddenDependencies).toStrictEqual(['command-use-case'])

  cleanupDir(tempDir)
})

it('rejects forbiddenDependencies referencing undefined roles', () => {
  const tempDir = createTempDir()
  const configPath = writeConfig(tempDir, {
    ...baseConfig,
    roles: [
      {
        forbiddenDependencies: ['nonexistent-role'],
        name: 'command-use-case',
        targets: ['function'],
      },
    ],
  })
  createRoleDefsDir(tempDir, [commandRole])

  expect(() => loadRoleEnforcementConfig(configPath)).toThrowError(
    new RoleEnforcementConfigError(
      "Invalid role enforcement config: roles.0.forbiddenDependencies: 'nonexistent-role' is not a defined role.",
    ),
  )

  cleanupDir(tempDir)
})

it('rejects layer allowedRoles referencing undefined roles', () => {
  const tempDir = createTempDir()
  const configPath = writeConfig(tempDir, {
    ...baseConfig,
    layers: {
      commands: {
        allowedRoles: ['nonexistent-role'],
        paths: ['src/**/commands'],
      },
    },
  })
  createRoleDefsDir(tempDir, [commandRole])

  expect(() => loadRoleEnforcementConfig(configPath)).toThrowError(
    new RoleEnforcementConfigError(
      "Invalid role enforcement config: layers.commands.allowedRoles: 'nonexistent-role' is not a defined role.",
    ),
  )

  cleanupDir(tempDir)
})

it('rejects malformed json files', () => {
  const tempDir = createTempDir()
  const configPath = path.join(tempDir, 'role-enforcement.config.json')
  writeFileSync(configPath, '{')

  expect(() => loadRoleEnforcementConfig(configPath)).toThrowError(RoleEnforcementConfigError)

  cleanupDir(tempDir)
})

it('reports root-level schema violations', () => {
  const tempDir = createTempDir()
  const configPath = writeConfig(tempDir, {
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
  })

  expect(() => loadRoleEnforcementConfig(configPath)).toThrowError(
    new RoleEnforcementConfigError(
      "Invalid role enforcement config: $: must have required property 'roleDefinitionsDir'; $: must NOT have additional properties; roles: must NOT have fewer than 1 items",
    ),
  )

  cleanupDir(tempDir)
})

it('rejects config when roleDefinitionsDir directory does not exist', () => {
  const tempDir = createTempDir()
  const configPath = writeConfig(tempDir, {
    ...baseConfig,
    roleDefinitionsDir: 'nonexistent-dir',
  })

  expect(() => loadRoleEnforcementConfig(configPath)).toThrowError(
    new RoleEnforcementConfigError(
      'roleDefinitionsDir: missing files: index.md, command-use-case.md',
    ),
  )

  cleanupDir(tempDir)
})

it('rejects config when index.md is missing from roleDefinitionsDir', () => {
  const tempDir = createTempDir()
  const configPath = writeConfig(tempDir, baseConfig)
  createRoleDefsDir(tempDir, [commandRole], false)

  expect(() => loadRoleEnforcementConfig(configPath)).toThrowError(
    new RoleEnforcementConfigError('roleDefinitionsDir: missing files: index.md'),
  )

  cleanupDir(tempDir)
})

it('rejects config when role definition files are missing', () => {
  const tempDir = createTempDir()
  const configPath = writeConfig(tempDir, baseConfig)
  createRoleDefsDir(tempDir, [], true)

  expect(() => loadRoleEnforcementConfig(configPath)).toThrowError(
    new RoleEnforcementConfigError('roleDefinitionsDir: missing files: command-use-case.md'),
  )

  cleanupDir(tempDir)
})

it('includes roleDefinitionsDir absolute path in loaded config', () => {
  const tempDir = createTempDir()
  const configPath = writeConfig(tempDir, baseConfig)
  createRoleDefsDir(tempDir, [commandRole])

  const loadedConfig = loadRoleEnforcementConfig(configPath)
  const expectedDir = path.resolve(tempDir, 'role-definitions')

  expect(loadedConfig.roleDefinitionsDir).toBe(expectedDir)

  cleanupDir(tempDir)
})
