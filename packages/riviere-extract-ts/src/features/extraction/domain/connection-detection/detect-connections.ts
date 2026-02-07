import { performance } from 'node:perf_hooks'
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

export interface ConnectionTimings {
  callGraphMs: number
  asyncDetectionMs: number
  setupMs: number
  totalMs: number
}

export interface ConnectionDetectionResult {
  links: ExtractedLink[]
  timings: ConnectionTimings
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
): ConnectionDetectionResult {
  const totalStart = performance.now()

  const setupStart = performance.now()
  const componentIndex = new ComponentIndex(components)
  const sourceFilePaths = computeFilteredFilePaths(project, options.moduleGlobs, globMatcher)
  const setupMs = performance.now() - setupStart

  const strict = options.allowIncomplete !== true

  const callGraphStart = performance.now()
  const syncLinks = buildCallGraph(project, components, componentIndex, {
    strict,
    sourceFilePaths,
  })
  const callGraphMs = performance.now() - callGraphStart

  const asyncStart = performance.now()
  const publishLinks = detectPublishConnections(project, components, { strict })
  const subscribeLinks = detectSubscribeConnections(components, { strict })
  const asyncDetectionMs = performance.now() - asyncStart

  const totalMs = performance.now() - totalStart

  return {
    links: [...syncLinks, ...publishLinks, ...subscribeLinks],
    timings: {
      callGraphMs,
      asyncDetectionMs,
      setupMs,
      totalMs,
    },
  }
}
