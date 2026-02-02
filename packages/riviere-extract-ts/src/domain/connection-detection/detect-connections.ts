import type { Project } from 'ts-morph'
import type { EnrichedComponent } from '../value-extraction/enrich-components'
import type { GlobMatcher } from '../component-extraction/extractor'
import type { ExtractedLink } from './extracted-link'
import { ComponentIndex } from './component-index'
import { buildCallGraph } from './call-graph/build-call-graph'
import { detectPublishConnections } from './async-detection/detect-publish-connections'
import { detectSubscribeConnections } from './async-detection/detect-subscribe-connections'

export interface ConnectionDetectionOptions {
  allowIncomplete?: boolean
  moduleGlobs: string[]
}

function computeFilteredFilePaths(
  project: Project,
  moduleGlobs: string[],
  globMatcher: GlobMatcher,
): string[] {
  return project
    .getSourceFiles()
    .map((sf) => sf.getFilePath())
    .filter((filePath) => moduleGlobs.some((glob) => globMatcher(filePath, glob)))
}

export function detectConnections(
  project: Project,
  components: readonly EnrichedComponent[],
  options: ConnectionDetectionOptions,
  globMatcher: GlobMatcher,
): ExtractedLink[] {
  const componentIndex = new ComponentIndex(components)
  const sourceFilePaths = computeFilteredFilePaths(project, options.moduleGlobs, globMatcher)
  const strict = !options.allowIncomplete
  const syncLinks = buildCallGraph(project, components, componentIndex, {
    strict,
    sourceFilePaths,
  })
  const publishLinks = detectPublishConnections(project, components, { strict })
  const subscribeLinks = detectSubscribeConnections(components, { strict })
  return [...syncLinks, ...publishLinks, ...subscribeLinks]
}
