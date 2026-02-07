import { performance } from 'node:perf_hooks'
import type { Project } from 'ts-morph'
import type { ConnectionPattern } from '@living-architecture/riviere-extract-config'
import type { EnrichedComponent } from '../value-extraction/enrich-components'
import type { GlobMatcher } from '../component-extraction/extractor'
import type { ExtractedLink } from './extracted-link'
import { ComponentIndex } from './component-index'
import { buildCallGraph } from './call-graph/build-call-graph'
import { detectPublishConnections } from './async-detection/detect-publish-connections'
import { detectSubscribeConnections } from './async-detection/detect-subscribe-connections'
import { detectConfigurableConnections } from './configurable/detect-configurable-connections'

export interface ConnectionDetectionOptions {
  allowIncomplete?: boolean
  moduleGlobs: string[]
  patterns?: ConnectionPattern[]
}

export interface ConnectionTimings {
  callGraphMs: number
  asyncDetectionMs: number
  configurableMs: number
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

  const strict = !options.allowIncomplete

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

  const patterns = options.patterns ?? []
  const configurableStart = performance.now()
  const configurableLinks = detectConfigurableConnections(project, patterns, components, { strict })
  const configurableMs = patterns.length > 0 ? performance.now() - configurableStart : 0

  const totalMs = performance.now() - totalStart

  return {
    links: [...syncLinks, ...publishLinks, ...subscribeLinks, ...configurableLinks],
    timings: {
      callGraphMs,
      asyncDetectionMs,
      configurableMs,
      setupMs,
      totalMs,
    },
  }
}
