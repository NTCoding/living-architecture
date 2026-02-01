import type { Project } from 'ts-morph'
import type { EnrichedComponent } from '../value-extraction/enrich-components'
import type { GlobMatcher } from '../component-extraction/extractor'
import type { ExtractedLink } from './extracted-link'
import { ComponentIndex } from './component-index'
import { buildCallGraph } from './call-graph/build-call-graph'

export interface ConnectionDetectionOptions {
  allowIncomplete?: boolean
  moduleGlobs: string[]
}

function filterSourceFiles(
  project: Project,
  moduleGlobs: string[],
  globMatcher: GlobMatcher,
): void {
  const toRemove = project.getSourceFiles().filter((sourceFile) => {
    const filePath = sourceFile.getFilePath()
    return !moduleGlobs.some((glob) => globMatcher(filePath, glob))
  })
  for (const file of toRemove) {
    project.removeSourceFile(file)
  }
}

export function detectConnections(
  project: Project,
  components: readonly EnrichedComponent[],
  options: ConnectionDetectionOptions,
  globMatcher: GlobMatcher,
): ExtractedLink[] {
  const componentIndex = new ComponentIndex(components)
  filterSourceFiles(project, options.moduleGlobs, globMatcher)
  const sourceFilePaths = project.getSourceFiles().map((sf) => sf.getFilePath())
  return buildCallGraph(project, components, componentIndex, {
    strict: options.allowIncomplete !== true,
    sourceFilePaths,
  })
}
