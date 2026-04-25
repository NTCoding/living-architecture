import { posix } from 'node:path'
import type { Project } from 'ts-morph'
import type * as RiviereSchema from '@living-architecture/riviere-schema'
import type * as ExtractConfig from '@living-architecture/riviere-extract-config'
import { RiviereBuilder } from '@living-architecture/riviere-builder'
import {
  extractInto,
  mergeWritePort,
  strictWritePort,
  type DraftComponent,
  type StrictExtractionWritePort,
  type WorkflowBuilder,
  type WorkflowDiagnostics,
  type WorkflowStepContext,
} from '@living-architecture/riviere-extract-ts'
import type { ExtractionOutcome } from './extraction-outcome'
import {
  toOutcomeComponentId,
  toPresentedComponent,
  toPresentedLink,
} from './extraction-project-presentation'

/** @riviere-role value-object */
export interface ModuleContext {
  module: ExtractConfig.Module
  files: string[]
  project: Project
}

/** @riviere-role value-object */
export type ExtractGlobMatcher = (path: string, pattern: string) => boolean

/** @riviere-role domain-error */
class DraftComponentModuleResolutionError extends Error {
  constructor(componentName: string, filePath: string) {
    super(
      `Unable to resolve module for draft component '${componentName}' from source file '${filePath}'.`,
    )
    this.name = 'DraftComponentModuleResolutionError'
  }
}

/** @riviere-role domain-error */
export class AmbiguousDraftComponentModuleError extends Error {
  constructor(componentName: string, filePath: string, moduleNames: string[]) {
    super(
      `Draft component '${componentName}' from source file '${filePath}' matched multiple modules: ${moduleNames.join(', ')}`,
    )
    this.name = 'AmbiguousDraftComponentModuleError'
  }
}

/** @riviere-role aggregate */
export class ExtractionProject {
  constructor(
    private readonly configDir: string,
    private readonly moduleContexts: ModuleContext[],
    private readonly resolvedConfig: ExtractConfig.ResolvedExtractionConfig,
    private readonly repositoryName: string,
    private readonly draftComponents: DraftComponent[] = [],
    private readonly globMatcher: ExtractGlobMatcher,
  ) {}

  extractDraftComponents(options: {
    allowIncomplete: boolean
    includeConnections: boolean
  }): ExtractionOutcome {
    const builder = this.createBuilder()
    const writePort = strictWritePort(builder)
    const outcome = extractInto(writePort, this.resolvedConfig, {
      allowIncomplete: options.allowIncomplete,
      configDir: this.configDir,
      includeConnections: options.includeConnections,
      mode: 'extract',
      repository: this.repositoryName,
      globMatcher: this.globMatcher,
      moduleContexts: this.moduleContexts,
    })

    return outcome.kind === 'full'
      ? this.toBuilderBackedOutcome(builder.build(), outcome, writePort)
      : outcome
  }

  enrichDraftComponents(options: {
    allowIncomplete: boolean
    includeConnections: boolean
  }): ExtractionOutcome {
    const builder = this.createBuilder()
    const writePort = strictWritePort(builder)
    const outcome = extractInto(writePort, this.resolvedConfig, {
      allowIncomplete: options.allowIncomplete,
      configDir: this.configDir,
      draftComponents: this.normalizeDraftComponents(),
      includeConnections: options.includeConnections,
      mode: 'enrich',
      repository: this.repositoryName,
      globMatcher: this.globMatcher,
      moduleContexts: this.moduleContexts,
    })

    return outcome.kind === 'full'
      ? this.toBuilderBackedOutcome(builder.build(), outcome, writePort)
      : outcome
  }

  extractIntoWorkflowBuilder(
    workflowBuilder: WorkflowBuilder,
    diagnostics: WorkflowDiagnostics,
    stepContext: WorkflowStepContext,
    options: {
      allowIncomplete: boolean
      includeConnections: boolean
      mode: 'extract' | 'enrich'
    },
  ): ExtractTsExtractionSummary {
    return extractInto(
      mergeWritePort(workflowBuilder, diagnostics, stepContext),
      this.resolvedConfig,
      {
        allowIncomplete: options.allowIncomplete,
        configDir: this.configDir,
        ...(options.mode === 'enrich' ? { draftComponents: this.normalizeDraftComponents() } : {}),
        includeConnections: options.includeConnections,
        mode: options.mode,
        repository: this.repositoryName,
        globMatcher: this.globMatcher,
        moduleContexts: this.moduleContexts,
      },
    )
  }

  private createBuilder() {
    return RiviereBuilder.new(this.createBuilderOptions())
  }

  private createBuilderOptions(): {
    sources: RiviereSchema.SourceInfo[]
    domains: Record<string, RiviereSchema.DomainMetadata>
  } {
    return {
      sources: this.resolvedConfig.sources ?? [{ repository: this.repositoryName }],
      domains: this.resolvedConfig.domains ?? deriveDomains(this.moduleContexts),
    }
  }

  private normalizeDraftComponents(): DraftComponent[] {
    return this.draftComponents.map((component) => {
      if (typeof component.module === 'string' && component.module.trim() !== '') {
        return component
      }

      return {
        ...component,
        module: this.resolveModuleFromLocation(component.name, component.location.file),
      }
    })
  }

  private resolveModuleFromLocation(componentName: string, filePath: string): string {
    const sourceFileMatches = this.moduleContexts
      .filter((moduleContext) => moduleContext.files.includes(filePath))
      .map((moduleContext) => moduleContext.module.name)
    const sourceFileMatch = sourceFileMatches[0]

    if (sourceFileMatch !== undefined && sourceFileMatches.length === 1) {
      return sourceFileMatch
    }

    if (sourceFileMatches.length > 1) {
      throw new AmbiguousDraftComponentModuleError(componentName, filePath, sourceFileMatches)
    }

    const pathMatches = this.moduleContexts
      .filter((moduleContext) => matchesModulePath(filePath, moduleContext.module.path))
      .map((moduleContext) => moduleContext.module.name)
    const pathMatch = pathMatches[0]

    if (pathMatch !== undefined && pathMatches.length === 1) {
      return pathMatch
    }

    if (pathMatches.length > 1) {
      throw new AmbiguousDraftComponentModuleError(componentName, filePath, pathMatches)
    }

    throw new DraftComponentModuleResolutionError(componentName, filePath)
  }

  private toBuilderBackedOutcome(
    graph: RiviereSchema.RiviereGraph,
    outcome: Extract<ExtractionOutcome, { kind: 'full' }>,
    writePort: StrictExtractionWritePort,
  ): ExtractionOutcome {
    const outcomeComponentsById = new Map(
      outcome.components.map((component) => [toOutcomeComponentId(component), component] as const),
    )

    return {
      kind: 'full',
      components: graph.components
        .filter((component) => outcomeComponentsById.has(component.id))
        .map((component) =>
          toPresentedComponent(component, writePort.missingFields(), outcomeComponentsById),
        ),
      failedFields: outcome.failedFields,
      links: graph.links.map((link) => toPresentedLink(link, writePort.uncertainLinks())),
      externalLinks: graph.externalLinks ?? [],
      timings: outcome.timings,
    }
  }
}

function deriveDomains(
  moduleContexts: readonly ModuleContext[],
): Record<string, RiviereSchema.DomainMetadata> {
  const domainEntries = moduleContexts.flatMap((moduleContext) => {
    if (moduleContext.module.domain.trim() === '') {
      return []
    }

    return [
      [
        moduleContext.module.domain,
        {
          description: `${moduleContext.module.domain} extracted domain`,
          systemType: 'domain',
        },
      ] as const,
    ]
  })

  if (domainEntries.length > 0) {
    return Object.fromEntries(domainEntries)
  }

  return {
    extracted: {
      description: 'Extracted domain',
      systemType: 'domain',
    },
  }
}

function matchesModulePath(filePath: string, modulePath: string): boolean {
  const normalizedFilePath = filePath.split('\\').join('/')
  const normalizedModulePath = posix.normalize(modulePath)
  return normalizedModulePath === '.' || normalizedFilePath.includes(`/${normalizedModulePath}/`)
}

type ExtractTsExtractionSummary = ReturnType<typeof extractInto>
