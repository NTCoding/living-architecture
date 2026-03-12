import { posix } from 'node:path'
import type { Project } from 'ts-morph'
import type {
  Module, ResolvedExtractionConfig 
} from '@living-architecture/riviere-extract-config'
import {
  deduplicateCrossStrategy,
  detectCrossModuleConnections,
  detectPerModuleConnections,
  enrichComponents,
  extractComponents,
  matchesGlob,
  type ConnectionTimings,
  type DraftComponent,
  type EnrichedComponent,
  type ExtractedLink,
} from '@living-architecture/riviere-extract-ts'

/** @riviere-role value-object */
export interface ModuleContext {
  module: Module
  files: string[]
  project: Project
}

/** @riviere-role value-object */
export class OrphanedDraftComponentError extends Error {
  constructor(orphanedModules: string[], knownModules: string[]) {
    super(
      `Draft components reference unknown modules: [${orphanedModules.join(', ')}]. Known modules: [${knownModules.join(', ')}]`,
    )
    this.name = 'OrphanedDraftComponentError'
  }
}

/** @riviere-role value-object */
export interface EnrichDraftComponentsResultValue {
  components: EnrichedComponent[]
  failedFields: string[]
}

/** @riviere-role value-object */
export interface DetectConnectionsResultValue {
  links: ExtractedLink[]
  timings: ConnectionTimings[]
}

/** @riviere-role aggregate */
export class ExtractionProject {
  constructor(
    private readonly configDir: string,
    private readonly moduleContexts: ModuleContext[],
    private readonly resolvedConfig: ResolvedExtractionConfig,
  ) {}

  extractDraftComponents(): DraftComponent[] {
    return this.moduleContexts.flatMap((moduleContext) =>
      extractComponents(
        moduleContext.project,
        moduleContext.files,
        this.resolvedConfig,
        matchesGlob,
        this.configDir,
      ),
    )
  }

  enrichDraftComponents(draftComponents: DraftComponent[]): EnrichDraftComponentsResultValue {
    const moduleNames = new Set(
      this.moduleContexts.map((moduleContext) => moduleContext.module.name),
    )
    const draftsByModule = groupDraftsByModule(draftComponents)
    assertAllDraftsMatchModules(draftsByModule, moduleNames)
    const components: EnrichedComponent[] = []
    const failedFieldSet = new Set<string>()

    for (const moduleContext of this.moduleContexts) {
      const moduleDrafts = draftsByModule.get(moduleContext.module.name) ?? []
      if (moduleDrafts.length === 0) {
        continue
      }

      const result = enrichComponents(
        moduleDrafts,
        this.resolvedConfig,
        moduleContext.project,
        matchesGlob,
        this.configDir,
      )
      components.push(...result.components)
      for (const failure of result.failures) {
        failedFieldSet.add(failure.field)
      }
    }

    return {
      components,
      failedFields: [...failedFieldSet],
    }
  }

  detectConnections(
    enrichedComponents: EnrichedComponent[],
    repositoryName: string,
    allowIncomplete: boolean,
  ): DetectConnectionsResultValue {
    const links: ExtractedLink[] = []
    const timings: ConnectionTimings[] = []

    for (const moduleContext of this.moduleContexts) {
      const moduleComponents = enrichedComponents.filter(
        (component) => component.domain === moduleContext.module.name,
      )
      if (moduleComponents.length === 0) {
        continue
      }

      const result = detectPerModuleConnections(
        moduleContext.project,
        moduleComponents,
        {
          allowIncomplete,
          moduleGlobs: [posix.join(moduleContext.module.path, moduleContext.module.glob)],
          repository: repositoryName,
        },
        matchesGlob,
      )
      links.push(...result.links)
      timings.push({
        callGraphMs: result.timings.callGraphMs,
        asyncDetectionMs: 0,
        configurableMs: result.timings.configurableMs,
        setupMs: result.timings.setupMs,
        totalMs:
          result.timings.callGraphMs + result.timings.configurableMs + result.timings.setupMs,
      })
    }

    const crossResult = detectCrossModuleConnections(enrichedComponents, {
      allowIncomplete,
      repository: repositoryName,
    })
    links.push(...crossResult.links)
    timings.push({
      callGraphMs: 0,
      asyncDetectionMs: crossResult.timings.asyncDetectionMs,
      configurableMs: 0,
      setupMs: 0,
      totalMs: crossResult.timings.asyncDetectionMs,
    })

    return {
      links: deduplicateCrossStrategy(links),
      timings,
    }
  }
}

function assertAllDraftsMatchModules(
  draftsByModule: Map<string, DraftComponent[]>,
  moduleNames: Set<string>,
): void {
  const orphanedModules = [...draftsByModule.keys()].filter((name) => !moduleNames.has(name))
  if (orphanedModules.length > 0) {
    throw new OrphanedDraftComponentError(orphanedModules, [...moduleNames])
  }
}

function groupDraftsByModule(drafts: DraftComponent[]): Map<string, DraftComponent[]> {
  const grouped = new Map<string, DraftComponent[]>()
  for (const draft of drafts) {
    const existing = grouped.get(draft.domain)
    if (existing !== undefined) {
      existing.push(draft)
      continue
    }

    grouped.set(draft.domain, [draft])
  }

  return grouped
}
