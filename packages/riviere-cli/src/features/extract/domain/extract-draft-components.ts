import type { Project } from 'ts-morph'
import type {
  Module, ResolvedExtractionConfig 
} from '@living-architecture/riviere-extract-config'
import {
  extractComponents,
  matchesGlob,
  type DraftComponent,
} from '@living-architecture/riviere-extract-ts'

export interface ModuleContext {
  module: Module
  files: string[]
  project: Project
}

export function extractDraftComponents(
  moduleContexts: ModuleContext[],
  resolvedConfig: ResolvedExtractionConfig,
  configDir: string,
): DraftComponent[] {
  return moduleContexts.flatMap((ctx) =>
    extractComponents(ctx.project, ctx.files, resolvedConfig, matchesGlob, configDir),
  )
}
