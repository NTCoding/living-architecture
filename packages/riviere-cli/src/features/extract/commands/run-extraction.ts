import type { ResolvedExtractionConfig } from '@living-architecture/riviere-extract-config'
import { DraftComponentStore } from '../../../platform/infra/persistence/draft-component-store'
import { ExtractionConfigRepository } from '../../../platform/infra/persistence/extraction-config-repository'
import { resolveFilteredSourceFiles } from '../../../platform/infra/source-filtering/filter-source-files'
import { getRepositoryInfo } from '../../../platform/infra/git/git-repository-info'
import type { ExtractionExecutionOptions } from '../domain/extraction-execution-options'
import { ModuleContextBuilder } from '../domain/module-context-builder'
import { performExtraction } from '../domain/perform-extraction'
import type { ExtractionResult } from '../domain/extraction-result'
import { GlobFileSearcher } from '../infra/external-client/glob/glob-file-searcher'
import { DefaultTsMorphProjectBuilder } from '../infra/external-client/ts-morph/default-ts-morph-project-builder'

export interface RunExtractionCommandInput extends ExtractionExecutionOptions {
  readonly configPath: string
  readonly enrich?: string
  readonly pr?: boolean
  readonly base?: string
  readonly files?: string[]
  readonly tsConfig?: boolean | undefined
}

/** @riviere-role command-use-case */
export function runExtraction(options: RunExtractionCommandInput): ExtractionResult {
  const extractionConfigRepository = new ExtractionConfigRepository()
  const {
    resolvedConfig,
    configDir,
  }: {
    resolvedConfig: ResolvedExtractionConfig
    configDir: string
  } = extractionConfigRepository.load(options.configPath)
  const allSourceFilePaths = extractionConfigRepository.resolveSourceFiles(
    resolvedConfig,
    configDir,
  )
  const sourceFilePaths = resolveFilteredSourceFiles(allSourceFilePaths, options)
  const skipTsConfig = options.tsConfig === false
  const moduleContextBuilder = new ModuleContextBuilder(
    new GlobFileSearcher(),
    new DefaultTsMorphProjectBuilder(),
  )
  const moduleContexts = moduleContextBuilder.buildAll(
    resolvedConfig,
    configDir,
    sourceFilePaths,
    skipTsConfig,
  )

  const repositoryInfo = getRepositoryInfo()

  return performExtraction({
    options,
    moduleContexts,
    resolvedConfig,
    configDir,
    repositoryName: repositoryInfo.name,
    ...(options.enrich === undefined
      ? {}
      : { draftComponents: new DraftComponentStore().load(options.enrich) }),
  })
}
