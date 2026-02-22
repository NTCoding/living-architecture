import {
  posix, resolve 
} from 'node:path'
import { globSync } from 'glob'
import type { ResolvedExtractionConfig } from '@living-architecture/riviere-extract-config'
import type { ModuleContext } from '../../domain/extract-draft-components'
import { findModuleTsConfigDir } from './find-module-tsconfig-dir'
import { loadExtractionProject } from './load-extraction-project'

export function createModuleContexts(
  resolvedConfig: ResolvedExtractionConfig,
  configDir: string,
  sourceFilePaths: string[],
  skipTsConfig: boolean,
): ModuleContext[] {
  const sourceFileSet = new Set(sourceFilePaths)

  return resolvedConfig.modules.map((module) => {
    const allModuleFiles = globSync(posix.join(module.path, module.glob), { cwd: configDir }).map(
      (f) => resolve(configDir, f),
    )
    const moduleFiles = allModuleFiles.filter((f) => sourceFileSet.has(f))

    const tsConfigDir = findModuleTsConfigDir(configDir, module.path)
    const project = loadExtractionProject(tsConfigDir, moduleFiles, skipTsConfig)

    return {
      module,
      files: moduleFiles,
      project,
    }
  })
}
