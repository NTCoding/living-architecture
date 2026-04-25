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
}): string[] {
  const sourceFilePaths = parsedConfigState.resolvedConfig.modules
    .flatMap((module) =>
      globSync(path.posix.join(module.path, module.glob), { cwd: parsedConfigState.configDir }),
    )
    .map((filePath) => path.resolve(parsedConfigState.configDir, filePath))

  if (sourceFilePaths.length === 0) {
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
): string[] {
  const missingFiles = requestedFiles.filter((filePath) => !fs.existsSync(path.resolve(filePath)))
  if (missingFiles.length > 0) {
    throw new ConfigValidationError(
      CliErrorCode.ValidationError,
      `Files not found: ${missingFiles.join(', ')}`,
    )
  }

  const requestedAbsolute = new Set(requestedFiles.map((filePath) => path.resolve(filePath)))
  return allSourceFiles.filter((filePath) => requestedAbsolute.has(filePath))
}

/** @riviere-role external-client-service */
export function createModuleContexts(
  configDir: string,
  resolvedConfig: ExtractConfig.ResolvedExtractionConfig,
  sourceFilePaths: string[],
  useTsConfig: boolean,
): ModuleContext[] {
  const sourceFileSet = new Set(sourceFilePaths)

  return resolvedConfig.modules.map((module) => {
    const allModuleFiles = globSync(path.posix.join(module.path, module.glob), {cwd: configDir,}).map((filePath) => path.resolve(configDir, filePath))
    const moduleFiles = allModuleFiles.filter((filePath) => sourceFileSet.has(filePath))
    const moduleConfigDir = findModuleTsConfigDir(configDir, module.path)
    const project = createConfiguredProject(moduleConfigDir, !useTsConfig)
    project.addSourceFilesAtPaths(moduleFiles)

    return {
      files: moduleFiles,
      module,
      project,
    }
  })
}

export const extractionProjectGlobMatcher = ExtractTs.matchesGlob
