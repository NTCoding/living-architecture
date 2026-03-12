import {
  posix, resolve 
} from 'node:path'
import { globSync } from 'glob'
import type { DraftComponent } from '@living-architecture/riviere-extract-ts'
import {
  loadAndValidateConfig,
  resolveSourceFiles,
} from '../../../../../platform/infra/extraction-config/config-loader'
import { loadDraftComponentsFromFile } from '../../../../../platform/infra/extraction-config/draft-component-loader'
import { getRepositoryInfo } from '../../../../../platform/infra/git/git-repository-info'
import { resolveFilteredSourceFiles } from '../../../../../platform/infra/source-filtering/filter-source-files'
import {
  ExtractionProject, type ModuleContext 
} from '../../../domain/extraction-project'
import { createConfiguredProject } from '../../external-clients/create-configured-project'
import { findModuleTsConfigDir } from '../../external-clients/find-module-tsconfig-dir'

interface FullProjectParams {
  configPath: string
  useTsConfig: boolean
}

interface ChangedProjectParams {
  baseBranch?: string
  configPath: string
  useTsConfig: boolean
}

interface SelectedFilesProjectParams {
  configPath: string
  filePaths: string[]
  useTsConfig: boolean
}

interface DraftEnrichmentParams {
  configPath: string
  draftComponentsPath: string
  useTsConfig: boolean
}

type ParsedConfigState = {
  configDir: string
  resolvedConfig: Awaited<ReturnType<typeof loadAndValidateConfig>>['resolvedConfig']
}

/** @riviere-role aggregate-repository */
export function loadChangedProject(
  loadChangedProjectParams: ChangedProjectParams,
): ExtractionProject {
  const parsedConfigState = loadParsedConfigState(loadChangedProjectParams.configPath)
  const sourceFilePaths = resolveFilteredSourceFiles(
    resolveSourceFilePaths(parsedConfigState),
    loadChangedProjectParams.baseBranch === undefined
      ? { pr: true }
      : {
        base: loadChangedProjectParams.baseBranch,
        pr: true 
      },
  )
  return createExtractionProject(
    parsedConfigState,
    sourceFilePaths,
    loadChangedProjectParams.useTsConfig,
  )
}

/** @riviere-role aggregate-repository */
export function loadFullProject(loadFullProjectParams: FullProjectParams): ExtractionProject {
  const parsedConfigState = loadParsedConfigState(loadFullProjectParams.configPath)
  return createExtractionProject(
    parsedConfigState,
    resolveSourceFilePaths(parsedConfigState),
    loadFullProjectParams.useTsConfig,
  )
}

/** @riviere-role aggregate-repository */
export function loadProjectForDraftEnrichment(
  draftEnrichmentParams: DraftEnrichmentParams,
): ExtractionProject {
  const parsedConfigState = loadParsedConfigState(draftEnrichmentParams.configPath)
  return createExtractionProject(
    parsedConfigState,
    resolveSourceFilePaths(parsedConfigState),
    draftEnrichmentParams.useTsConfig,
    loadDraftComponentsFromFile(draftEnrichmentParams.draftComponentsPath),
  )
}

/** @riviere-role aggregate-repository */
export function loadSelectedFiles(
  selectedFilesProjectParams: SelectedFilesProjectParams,
): ExtractionProject {
  const parsedConfigState = loadParsedConfigState(selectedFilesProjectParams.configPath)
  const sourceFilePaths = resolveFilteredSourceFiles(resolveSourceFilePaths(parsedConfigState), {files: selectedFilesProjectParams.filePaths,})
  return createExtractionProject(
    parsedConfigState,
    sourceFilePaths,
    selectedFilesProjectParams.useTsConfig,
  )
}

function createExtractionProject(
  parsedConfigState: ParsedConfigState,
  sourceFilePaths: string[],
  useTsConfig: boolean,
  draftComponents: DraftComponent[] = [],
): ExtractionProject {
  return new ExtractionProject(
    parsedConfigState.configDir,
    createModuleContexts(parsedConfigState, sourceFilePaths, useTsConfig),
    parsedConfigState.resolvedConfig,
    getRepositoryInfo().name,
    draftComponents,
  )
}

function createModuleContexts(
  parsedConfigState: ParsedConfigState,
  sourceFilePaths: string[],
  useTsConfig: boolean,
): ModuleContext[] {
  const sourceFileSet = new Set(sourceFilePaths)

  return parsedConfigState.resolvedConfig.modules.map((module) => {
    const allModuleFiles = globSync(posix.join(module.path, module.glob), {cwd: parsedConfigState.configDir,}).map((filePath) => resolve(parsedConfigState.configDir, filePath))
    const moduleFiles = allModuleFiles.filter((filePath) => sourceFileSet.has(filePath))
    const moduleConfigDir = findModuleTsConfigDir(parsedConfigState.configDir, module.path)
    const project = createConfiguredProject(moduleConfigDir, !useTsConfig)
    project.addSourceFilesAtPaths(moduleFiles)

    return {
      files: moduleFiles,
      module,
      project,
    }
  })
}

function loadParsedConfigState(configPath: string): ParsedConfigState {
  return loadAndValidateConfig(configPath)
}

function resolveSourceFilePaths(parsedConfigState: ParsedConfigState): string[] {
  return resolveSourceFiles(parsedConfigState.resolvedConfig, parsedConfigState.configDir)
}
