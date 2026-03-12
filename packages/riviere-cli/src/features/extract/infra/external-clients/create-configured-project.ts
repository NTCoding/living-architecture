import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { Project } from 'ts-morph'

/** @riviere-role external-client-service */
export function createConfiguredProject(configDir: string, skipTsConfig: boolean): Project {
  if (skipTsConfig) {
    return new Project()
  }

  const tsConfigPath = resolve(configDir, 'tsconfig.json')
  if (!existsSync(tsConfigPath)) {
    return new Project()
  }

  return new Project({
    tsConfigFilePath: tsConfigPath,
    skipAddingFilesFromTsConfig: true,
  })
}
