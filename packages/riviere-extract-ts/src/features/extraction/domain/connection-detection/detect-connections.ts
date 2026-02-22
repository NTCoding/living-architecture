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
  repository: string
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

export function deduplicateCrossStrategy(links: ExtractedLink[]): ExtractedLink[] {
  const seen = new Map<string, ExtractedLink>()
  for (const link of links) {
    const key = `${link.source}|${link.target}|${link.type}`
    const existing = seen.get(key)
    if (existing !== undefined) {
      if (existing._uncertain !== undefined && link._uncertain === undefined) {
        seen.set(key, link)
      }
      continue
    }
    seen.set(key, link)
  }
  return [...seen.values()]
}

export interface PerModuleConnectionOptions {
  allowIncomplete?: boolean
  moduleGlobs: string[]
  patterns?: ConnectionPattern[]
  repository: string
}

export interface PerModuleTimings {
  callGraphMs: number
  configurableMs: number
  setupMs: number
}

export interface PerModuleDetectionResult {
  links: ExtractedLink[]
  timings: PerModuleTimings
}

export function detectPerModuleConnections(
  project: Project,
  components: readonly EnrichedComponent[],
  options: PerModuleConnectionOptions,
  globMatcher: GlobMatcher,
): PerModuleDetectionResult {
  const setupStart = performance.now()
  const componentIndex = new ComponentIndex(components)
  const sourceFilePaths = computeFilteredFilePaths(project, options.moduleGlobs, globMatcher)
  const setupMs = performance.now() - setupStart

  const strict = options.allowIncomplete !== true
  const repository = options.repository

  const callGraphStart = performance.now()
  const syncLinks = buildCallGraph(project, components, componentIndex, {
    strict,
    sourceFilePaths,
    repository,
  })
  const callGraphMs = performance.now() - callGraphStart

  const patterns = options.patterns ?? []
  const {
    configurableLinks, configurableMs 
  } = runConfigurableDetection(
    project,
    patterns,
    components,
    componentIndex,
    strict,
    repository,
  )

  return {
    links: [...syncLinks, ...configurableLinks],
    timings: {
      callGraphMs,
      configurableMs,
      setupMs,
    },
  }
}

export interface CrossModuleConnectionOptions {
  allowIncomplete?: boolean
  repository: string
}

export interface CrossModuleTimings {asyncDetectionMs: number}

export interface CrossModuleDetectionResult {
  links: ExtractedLink[]
  timings: CrossModuleTimings
}

export function detectCrossModuleConnections(
  allComponents: readonly EnrichedComponent[],
  options: CrossModuleConnectionOptions,
): CrossModuleDetectionResult {
  const strict = options.allowIncomplete !== true
  const repository = options.repository

  const asyncStart = performance.now()
  const publishLinks = detectPublishConnections(allComponents, {
    strict,
    repository,
  })
  const subscribeLinks = detectSubscribeConnections(allComponents, {
    strict,
    repository,
  })
  const asyncDetectionMs = performance.now() - asyncStart

  return {
    links: [...publishLinks, ...subscribeLinks],
    timings: { asyncDetectionMs },
  }
}

function runConfigurableDetection(
  project: Project,
  patterns: ConnectionPattern[],
  components: readonly EnrichedComponent[],
  componentIndex: ComponentIndex,
  strict: boolean,
  repository: string,
): {
  configurableLinks: ExtractedLink[]
  configurableMs: number
} {
  if (patterns.length === 0) {
    return {
      configurableLinks: [],
      configurableMs: 0,
    }
  }
  const configurableStart = performance.now()
  const links = detectConfigurableConnections(project, patterns, components, componentIndex, {
    strict,
    repository,
  })
  return {
    configurableLinks: links,
    configurableMs: performance.now() - configurableStart,
  }
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
  const repository = options.repository

  const callGraphStart = performance.now()
  const syncLinks = buildCallGraph(project, components, componentIndex, {
    strict,
    sourceFilePaths,
    repository,
  })
  const callGraphMs = performance.now() - callGraphStart

  const asyncStart = performance.now()
  const publishLinks = detectPublishConnections(components, {
    strict,
    repository,
  })
  const subscribeLinks = detectSubscribeConnections(components, {
    strict,
    repository,
  })
  const asyncDetectionMs = performance.now() - asyncStart

  const patterns = options.patterns ?? []
  const {
    configurableLinks, configurableMs 
  } = runConfigurableDetection(
    project,
    patterns,
    components,
    componentIndex,
    strict,
    repository,
  )

  const totalMs = performance.now() - totalStart

  const allLinks = [...syncLinks, ...publishLinks, ...subscribeLinks, ...configurableLinks]
  const deduplicatedLinks = deduplicateCrossStrategy(allLinks)

  return {
    links: deduplicatedLinks,
    timings: {
      callGraphMs,
      asyncDetectionMs,
      configurableMs,
      setupMs,
      totalMs,
    },
  }
}
