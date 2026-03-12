import {
  posix, resolve 
} from 'node:path'
import { globSync } from 'glob'
import type { ResolvedExtractionConfig } from '@living-architecture/riviere-extract-config'
import type {
  ExtractionProject, ModuleContext 
} from '../../domain/extraction-project'
import { createConfiguredProject } from '../external-clients/create-configured-project'
import { findModuleTsConfigDir } from '../external-clients/find-module-tsconfig-dir'

interface LoadExtractionProjectInput {
  configDir: string
  resolvedConfig: ResolvedExtractionConfig
  skipTsConfig: boolean
  sourceFilePaths: string[]
}

/** @riviere-role aggregate-repository */
export function loadExtractionProject(
  loadExtractionProjectInput: LoadExtractionProjectInput,
): ExtractionProject {
  return {
    configDir: loadExtractionProjectInput.configDir,
    moduleContexts: createModuleContexts(loadExtractionProjectInput),
    resolvedConfig: loadExtractionProjectInput.resolvedConfig,
  }
}

function createModuleContexts(
  loadExtractionProjectInput: LoadExtractionProjectInput,
): ModuleContext[] {
  const sourceFileSet = new Set(loadExtractionProjectInput.sourceFilePaths)

  return loadExtractionProjectInput.resolvedConfig.modules.map((module) => {
    const allModuleFiles = globSync(posix.join(module.path, module.glob), {cwd: loadExtractionProjectInput.configDir,}).map((filePath) => resolve(loadExtractionProjectInput.configDir, filePath))
    const moduleFiles = allModuleFiles.filter((filePath) => sourceFileSet.has(filePath))
    const moduleConfigDir = findModuleTsConfigDir(loadExtractionProjectInput.configDir, module.path)
    const project = createConfiguredProject(
      moduleConfigDir,
      loadExtractionProjectInput.skipTsConfig,
    )
    project.addSourceFilesAtPaths(moduleFiles)

    return {
      module,
      files: moduleFiles,
      project,
    }
  })
}
