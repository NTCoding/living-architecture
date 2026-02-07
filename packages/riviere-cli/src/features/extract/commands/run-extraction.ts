import { Project } from 'ts-morph'
import {
  extractComponents,
  enrichComponents,
  matchesGlob,
  detectConnections,
  ConnectionDetectionError,
  type EnrichedComponent,
} from '@living-architecture/riviere-extract-ts'
import type { ResolvedExtractionConfig } from '@living-architecture/riviere-extract-config'
import { formatSuccess } from '../../../platform/infra/cli-presentation/output'
import {
  loadDraftComponentsFromFile,
  DraftComponentLoadError,
} from '../../../platform/infra/extraction-config/draft-component-loader'
import { formatPrMarkdown } from '../../../platform/infra/cli-presentation/format-pr-markdown'
import {
  getRepositoryInfo, GitError 
} from '../../../platform/infra/git/git-repository-info'
import { formatDryRunOutput } from '../../../platform/infra/cli-presentation/extract-output-formatter'
import { outputResult } from '../../../platform/infra/cli-presentation/output-writer'
import {
  exitWithRuntimeError,
  exitWithExtractionFailure,
  exitWithConnectionDetectionFailure,
} from '../../../platform/infra/cli-presentation/exit-handlers'
import {
  countLinksByType,
  formatExtractionStats,
  formatTimingLine,
} from '../../../platform/infra/cli-presentation/format-extraction-stats'
import type { ExtractOptions } from '../../../platform/infra/cli-presentation/extract-validator'

function getRepositoryInfoSafe(): ReturnType<typeof getRepositoryInfo> {
  try {
    return getRepositoryInfo()
    /* v8 ignore start -- @preserve: GitError handling tested in git-repository-info.spec.ts */
  } catch (error) {
    if (error instanceof GitError) {
      exitWithRuntimeError(error.message)
    }
    throw error
  }
  /* v8 ignore stop */
}

function detectConnectionsSafe(
  project: Project,
  components: readonly EnrichedComponent[],
  moduleGlobs: string[],
  repository: string,
  allowIncomplete: boolean,
): ReturnType<typeof detectConnections> {
  try {
    return detectConnections(
      project,
      components,
      {
        allowIncomplete,
        moduleGlobs,
        repository,
      },
      matchesGlob,
    )
    /* v8 ignore start -- @preserve: ConnectionDetectionError tested via CLI integration */
  } catch (error) {
    if (error instanceof ConnectionDetectionError) {
      exitWithConnectionDetectionFailure(error.file, error.line, error.typeName, error.reason)
    }
    throw error
  }
  /* v8 ignore stop */
}

export function runExtraction(
  options: ExtractOptions,
  resolvedConfig: ResolvedExtractionConfig,
  configDir: string,
  sourceFilePaths: string[],
): void {
  const project = new Project()
  project.addSourceFilesAtPaths(sourceFilePaths)

  const draftComponents = (() => {
    if (options.enrich === undefined) {
      return extractComponents(project, sourceFilePaths, resolvedConfig, matchesGlob, configDir)
    }
    try {
      return loadDraftComponentsFromFile(options.enrich)
      /* v8 ignore start -- @preserve: DraftComponentLoadError handling */
    } catch (error) {
      if (error instanceof DraftComponentLoadError) {
        exitWithRuntimeError(error.message)
      }
      throw error
    }
    /* v8 ignore stop */
  })()

  /* v8 ignore start -- @preserve: dry-run path tested via CLI integration */
  if (options.dryRun) {
    for (const line of formatDryRunOutput(draftComponents)) {
      console.log(line)
    }
    return
  }
  /* v8 ignore stop */

  if (options.format === 'markdown') {
    const markdown = formatPrMarkdown({
      added: draftComponents.map((c) => ({
        type: c.type,
        name: c.name,
        domain: c.domain,
      })),
      modified: [],
      removed: [],
    })
    console.log(markdown)
    return
  }

  if (options.componentsOnly) {
    outputResult(formatSuccess(draftComponents), options)
    return
  }

  const enrichmentResult = enrichComponents(
    draftComponents,
    resolvedConfig,
    project,
    matchesGlob,
    configDir,
  )
  if (enrichmentResult.failures.length > 0 && options.allowIncomplete !== true) {
    exitWithExtractionFailure(enrichmentResult.failures.map((f) => f.field))
  }

  const repositoryInfo = getRepositoryInfoSafe()

  const {
    links, timings 
  } = detectConnectionsSafe(
    project,
    enrichmentResult.components,
    resolvedConfig.modules.map((m) => m.path),
    repositoryInfo.name,
    options.allowIncomplete === true,
  )

  console.error(formatTimingLine(timings))
  if (options.stats === true) {
    const stats = countLinksByType(enrichmentResult.components.length, links)
    for (const line of formatExtractionStats(stats)) {
      console.error(line)
    }
  }

  const outputOptions = options.output === undefined ? {} : { output: options.output }
  outputResult(
    formatSuccess({
      components: enrichmentResult.components,
      links,
    }),
    outputOptions,
  )
}
