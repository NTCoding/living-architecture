import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

/** @riviere-role extract-project-loader */
export function findModuleTsConfigDir(configDir: string, modulePath: string): string {
  const moduleTsConfigPath = resolve(configDir, modulePath, 'tsconfig.json')
  if (existsSync(moduleTsConfigPath)) {
    return resolve(configDir, modulePath)
  }
  return configDir
}
