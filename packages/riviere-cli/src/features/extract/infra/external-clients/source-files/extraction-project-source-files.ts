import * as fs from 'node:fs'
import * as path from 'node:path'
import { globSync } from 'glob'
import type * as ExtractConfig from '@living-architecture/riviere-extract-config'
import * as ExtractTs from '@living-architecture/riviere-extract-ts'
import {
  CliErrorCode,
  ConfigValidationError,
} from '../../../../../platform/infra/cli/presentation/error-codes'
import { detectChangedTypeScriptFiles } from '../../../../../platform/infra/external-clients/git/git-changed-files'
import { createConfiguredProject } from '../ts-morph/create-configured-project'
import { findModuleTsConfigDir } from '../ts-morph/find-module-tsconfig-dir'
import type { ModuleContext } from '../../../domain/extraction-project'

/** @riviere-role external-client-service */
export function resolveSourceFilePaths(parsedConfigState: {
  configDir: string
  resolvedConfig: ExtractConfig.ResolvedExtractionConfig
}): Map<ExtractConfig.Module, string[]> {
  const sourceFilePaths = new Map<ExtractConfig.Module, string[]>()

  for (const module of parsedConfigState.resolvedConfig.modules) {
    const moduleFiles = globSync(path.posix.join(module.path, module.glob), {cwd: parsedConfigState.configDir,}).map((filePath) => path.resolve(parsedConfigState.configDir, filePath))
    sourceFilePaths.set(module, moduleFiles)
  }

  if ([...sourceFilePaths.values()].flat().length === 0) {
    const patterns = parsedConfigState.resolvedConfig.modules
      .map((module) => path.posix.join(module.path, module.glob))
      .join(', ')
    throw new ConfigValidationError(
      CliErrorCode.ValidationError,
      `No files matched extraction patterns: ${patterns}
Config directory: ${parsedConfigState.configDir}`,
    )
  }

  return sourceFilePaths
}

/** @riviere-role external-client-service */
export function resolveChangedSourceFilePaths(
  allSourceFiles: string[],
  baseBranch?: string,
): string[] {
  const gitOptions = baseBranch === undefined ? {} : { base: baseBranch }
  const result = detectChangedTypeScriptFiles(process.cwd(), gitOptions)
  for (const warning of result.warnings) {
    console.error(warning)
  }
  const changedAbsolute = new Set(result.files.map((filePath) => path.resolve(filePath)))
  return allSourceFiles.filter((filePath) => changedAbsolute.has(filePath))
}

/** @riviere-role external-client-service */
export function resolveSelectedSourceFilePaths(
  allSourceFiles: string[],
  requestedFiles: string[],
  configDir: string,
): string[] {
  const missingFiles = requestedFiles.filter(
    (filePath) => !fs.existsSync(path.resolve(configDir, filePath)),
  )
  if (missingFiles.length > 0) {
    throw new ConfigValidationError(
      CliErrorCode.ValidationError,
      `Files not found: ${missingFiles.join(', ')}`,
    )
  }

  const requestedAbsolute = new Set(
    requestedFiles.map((filePath) => path.resolve(configDir, filePath)),
  )
  return allSourceFiles.filter((filePath) => requestedAbsolute.has(filePath))
}

/** @riviere-role external-client-service */
export function createModuleContexts(
  configDir: string,
  resolvedConfig: ExtractConfig.ResolvedExtractionConfig,
  sourceFilePaths: Map<ExtractConfig.Module, string[]>,
  sourceFileSet: string[],
  useTsConfig: boolean,
): ModuleContext[] {
  const selectedSourceFileSet = new Set(sourceFileSet)

  return resolvedConfig.modules.map((module) => {
    const moduleFiles = sourceFilePaths.get(module)
    if (moduleFiles === undefined) {
      throw new ConfigValidationError(
        CliErrorCode.ValidationError,
        `Expected source files for module '${module.name}'`,
      )
    }
    const selectedModuleFiles = moduleFiles.filter((filePath) =>
      selectedSourceFileSet.has(filePath),
    )
    const moduleConfigDir = findModuleTsConfigDir(configDir, module.path)
    const project = createConfiguredProject(moduleConfigDir, !useTsConfig)
    project.addSourceFilesAtPaths(selectedModuleFiles)

    return {
      files: selectedModuleFiles,
      module,
      project,
    }
  })
}

export const extractionProjectGlobMatcher = ExtractTs.matchesGlob
