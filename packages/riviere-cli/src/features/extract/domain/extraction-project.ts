import type { Project } from 'ts-morph'
import type * as RiviereSchema from '@living-architecture/riviere-schema'
import type * as ExtractConfig from '@living-architecture/riviere-extract-config'
import { RiviereBuilder } from '@living-architecture/riviere-builder'
import {
  extractInto,
  matchesGlob,
  strictWritePort,
  type DraftComponent,
} from '@living-architecture/riviere-extract-ts'
import type { ExtractionOutcome } from './extraction-outcome'

/** @riviere-role value-object */
export interface ModuleContext {
  module: ExtractConfig.Module
  files: string[]
  project: Project
}

/** @riviere-role aggregate */
export class ExtractionProject {
  constructor(
    private readonly configDir: string,
    private readonly moduleContexts: ModuleContext[],
    private readonly resolvedConfig: ExtractConfig.ResolvedExtractionConfig,
    private readonly repositoryName: string,
    private readonly draftComponents: DraftComponent[] = [],
  ) {}

  extractDraftComponents(options: {
    allowIncomplete: boolean
    includeConnections: boolean
  }): ExtractionOutcome {
    return extractInto(this.createWritePort(), this.resolvedConfig, {
      allowIncomplete: options.allowIncomplete,
      configDir: this.configDir,
      includeConnections: options.includeConnections,
      mode: 'extract',
      repository: this.repositoryName,
      globMatcher: matchesGlob,
      moduleContexts: this.moduleContexts,
    })
  }

  enrichDraftComponents(options: {
    allowIncomplete: boolean
    includeConnections: boolean
  }): ExtractionOutcome {
    return extractInto(this.createWritePort(), this.resolvedConfig, {
      allowIncomplete: options.allowIncomplete,
      configDir: this.configDir,
      draftComponents: this.normalizeDraftComponents(),
      includeConnections: options.includeConnections,
      mode: 'enrich',
      repository: this.repositoryName,
      globMatcher: matchesGlob,
      moduleContexts: this.moduleContexts,
    })
  }

  private createWritePort() {
    return strictWritePort(RiviereBuilder.new(this.createBuilderOptions()))
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
        module: this.resolveFallbackModule(component.domain),
      }
    })
  }

  private resolveFallbackModule(domain: string): string {
    const matchingModule = this.moduleContexts.find(
      (moduleContext) => moduleContext.module.domain === domain,
    )
    if (matchingModule !== undefined) {
      return matchingModule.module.name
    }

    const firstModule = this.moduleContexts[0]
    return firstModule?.module.name ?? 'unknown-module'
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
