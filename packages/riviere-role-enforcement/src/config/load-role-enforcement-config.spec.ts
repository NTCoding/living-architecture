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
      roles: [
        {
          allowedLocation: ['src/commands/*.ts'],
          allowedNames: ['runThing'],
          name: 'command-use-case',
          targets: ['function'],
        },
      ],
    }),
  )

  const loadedConfig = loadRoleEnforcementConfig(configPath)

  expect(loadedConfig.config.roles).toHaveLength(1)
  expect(loadedConfig.configDir).toBe(path.dirname(configPath))

  rmSync(path.dirname(configPath), {
    force: true,
    recursive: true,
  })
})

it('rejects roles without allowedNames or nameMatches', () => {
  const configPath = createTempConfigFile(
    JSON.stringify({
      ignorePatterns: [],
      include: ['src/**/*.ts'],
      roles: [
        {
          allowedLocation: ['src/commands/*.ts'],
          name: 'command-use-case',
          targets: ['function'],
        },
      ],
    }),
  )

  expect(() => loadRoleEnforcementConfig(configPath)).toThrowError(
    new RoleEnforcementConfigError(
      "Invalid role enforcement config: roles.0.allowedNames: Role definition must declare either 'allowedNames' or 'nameMatches'.",
    ),
  )

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
      roles: [
        {
          allowedLocation: ['src/commands/*.ts'],
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
