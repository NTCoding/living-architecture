import {
  existsSync, mkdtempSync, rmSync, writeFileSync 
} from 'node:fs'
import { tmpdir } from 'node:os'
import {
  dirname, join, resolve 
} from 'node:path'
import { spawnSync } from 'node:child_process'
import { parseRoleEnforcementCommandArgs } from '../domain/role-enforcement-command'

function createOxlintConfig(configPath: string): string {
  const tempDirectory = mkdtempSync(join(tmpdir(), 'riviere-role-enforcement-'))
  const pluginShimPath = join(tempDirectory, 'oxlint-plugin.cjs')
  const oxlintConfigPath = join(tempDirectory, '.oxlintrc.json')

  writeFileSync(
    pluginShimPath,
    `module.exports = require(${JSON.stringify(
      resolve('packages/riviere-role-enforcement/dist/features/check/infra/oxlint-plugin.cjs'),
    )}).default\n`,
  )

  writeFileSync(
    oxlintConfigPath,
    JSON.stringify(
      {
        jsPlugins: [
          {
            name: 'riviere-role',
            specifier: pluginShimPath,
          },
        ],
        rules: {'riviere-role/enforce-role-definitions': ['error', { configPath }],},
      },
      null,
      2,
    ),
  )

  return oxlintConfigPath
}

function getOxlintBinaryPath(): string {
  return resolve('node_modules/.bin/oxlint')
}

export function runRoleEnforcementCommand(args: readonly string[]): number {
  const command = parseRoleEnforcementCommandArgs(args)

  if (!existsSync(command.configPath)) {
    throw new TypeError(`Role enforcement config does not exist: ${command.configPath}`)
  }

  const oxlintConfigPath = createOxlintConfig(command.configPath)

  try {
    const result = spawnSync(getOxlintBinaryPath(), ['-c', oxlintConfigPath, ...command.targets], {stdio: 'inherit',})

    return result.status ?? 1
  } finally {
    rmSync(dirname(oxlintConfigPath), {
      recursive: true,
      force: true,
    })
  }
}
