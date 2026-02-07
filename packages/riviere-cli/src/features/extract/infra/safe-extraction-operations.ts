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
import {
  loadDraftComponentsFromFile,
  DraftComponentLoadError,
} from '../../../platform/infra/extraction-config/draft-component-loader'
import {
  getRepositoryInfo, GitError 
} from '../../../platform/infra/git/git-repository-info'
import {
  exitWithRuntimeError,
  exitWithExtractionFailure,
  exitWithConnectionDetectionFailure,
} from '../../../platform/infra/cli-presentation/exit-handlers'
import { formatTimingLine } from '../../../platform/infra/cli-presentation/format-extraction-stats'

/* v8 ignore start -- @preserve: GitError handling tested in git-repository-info.spec.ts */
export function getRepositoryInfoSafe(): ReturnType<typeof getRepositoryInfo> {
  try {
    return getRepositoryInfo()
  } catch (error) {
    if (error instanceof GitError) {
      exitWithRuntimeError(error.message)
    }
    throw error
  }
}
/* v8 ignore stop */

/* v8 ignore start -- @preserve: error handling tested via CLI */
export function loadOrExtractComponents(
  project: Project,
  sourceFilePaths: string[],
  resolvedConfig: ResolvedExtractionConfig,
  configDir: string,
  enrichPath: string | undefined,
) {
  if (enrichPath === undefined) {
    return extractComponents(project, sourceFilePaths, resolvedConfig, matchesGlob, configDir)
  }
  try {
    return loadDraftComponentsFromFile(enrichPath)
  } catch (error) {
    if (error instanceof DraftComponentLoadError) {
      exitWithRuntimeError(error.message)
    }
    throw error
  }
}

export function enrichComponentsSafe(
  draftComponents: Parameters<typeof enrichComponents>[0],
  resolvedConfig: ResolvedExtractionConfig,
  project: Project,
  configDir: string,
  allowIncomplete: boolean,
) {
  const result = enrichComponents(draftComponents, resolvedConfig, project, matchesGlob, configDir)
  if (result.failures.length > 0) {
    const failedFields = result.failures.map((f) => f.field)
    if (!allowIncomplete) {
      exitWithExtractionFailure(failedFields)
    }
    console.error(
      `Warning: Enrichment failed for ${failedFields.length} field(s): ${failedFields.join(', ')}`,
    )
  }
  return result
}

export function detectConnectionsSafe(
  project: Project,
  components: readonly EnrichedComponent[],
  moduleGlobs: string[],
  repository: string,
  allowIncomplete: boolean,
) {
  try {
    const result = detectConnections(
      project,
      components,
      {
        allowIncomplete,
        moduleGlobs,
        repository,
      },
      matchesGlob,
    )
    console.error(formatTimingLine(result.timings))
    return result
  } catch (error) {
    if (error instanceof ConnectionDetectionError) {
      exitWithConnectionDetectionFailure(error.file, error.line, error.typeName, error.reason)
    }
    throw error
  }
}
/* v8 ignore stop */
