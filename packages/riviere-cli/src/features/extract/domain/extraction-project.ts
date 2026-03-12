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
import { ExtractionFieldFailureError } from '../../../platform/infra/cli-presentation/error-codes'
import type { EnrichDraftComponentsResult } from '../commands/enrich-draft-components-result'
import type { ExtractDraftComponentsResult } from '../commands/extract-draft-components-result'

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

/** @riviere-role aggregate */
export class ExtractionProject {
  constructor(
    private readonly configDir: string,
    private readonly moduleContexts: ModuleContext[],
    private readonly resolvedConfig: ResolvedExtractionConfig,
    private readonly repositoryName: string,
    private readonly draftComponents: DraftComponent[] = [],
  ) {}

  extractDraftComponents(options: {
    allowIncomplete: boolean
    includeConnections: boolean
  }): ExtractDraftComponentsResult {
    const draftComponents = this.moduleContexts.flatMap((moduleContext) =>
      extractComponents(
        moduleContext.project,
        moduleContext.files,
        this.resolvedConfig,
        matchesGlob,
        this.configDir,
      ),
    )

    if (!options.includeConnections) {
      return {
        kind: 'draftOnly',
        components: draftComponents,
      }
    }

    const enrichment = this.enrichDraftComponentValues(draftComponents, options.allowIncomplete)
    const connectionResult = this.detectConnections(enrichment.components, options.allowIncomplete)

    return {
      kind: 'full',
      components: enrichment.components,
      failedFields: enrichment.failedFields,
      links: connectionResult.links,
      timings: connectionResult.timings,
    }
  }

  enrichDraftComponents(options: {
    allowIncomplete: boolean
    includeConnections: boolean
  }): EnrichDraftComponentsResult {
    if (!options.includeConnections) {
      return {
        kind: 'draftOnly',
        components: this.draftComponents,
      }
    }

    const enrichment = this.enrichDraftComponentValues(
      this.draftComponents,
      options.allowIncomplete,
    )
    const connectionResult = this.detectConnections(enrichment.components, options.allowIncomplete)

    return {
      kind: 'full',
      components: enrichment.components,
      failedFields: enrichment.failedFields,
      links: connectionResult.links,
      timings: connectionResult.timings,
    }
  }

  get moduleContextProjectNames(): string[] {
    return this.moduleContexts.map((moduleContext) => moduleContext.module.name)
  }

  private detectConnections(
    enrichedComponents: EnrichedComponent[],
    allowIncomplete: boolean,
  ): {
    links: ExtractedLink[]
    timings: ConnectionTimings[]
  } {
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
          repository: this.repositoryName,
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
      repository: this.repositoryName,
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

  private enrichDraftComponentValues(
    draftComponents: DraftComponent[],
    allowIncomplete: boolean,
  ): {
    components: EnrichedComponent[]
    failedFields: string[]
  } {
    const moduleNames = new Set(this.moduleContextProjectNames)
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

    const failedFields = [...failedFieldSet]
    if (failedFields.length > 0 && !allowIncomplete) {
      throw new ExtractionFieldFailureError(failedFields)
    }

    return {
      components,
      failedFields,
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
