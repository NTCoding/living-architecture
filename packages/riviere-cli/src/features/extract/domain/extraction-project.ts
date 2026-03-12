import type { Project } from 'ts-morph'
import type {
  Module, ResolvedExtractionConfig 
} from '@living-architecture/riviere-extract-config'
import {
  extractComponents,
  matchesGlob,
  type DraftComponent,
} from '@living-architecture/riviere-extract-ts'

/** @riviere-role value-object */
export interface ModuleContext {
  module: Module
  files: string[]
  project: Project
}

/** @riviere-role aggregate */
export interface ExtractionProject {
  configDir: string
  moduleContexts: ModuleContext[]
  resolvedConfig: ResolvedExtractionConfig
}

/** @riviere-role domain-service */
export function extractDraftComponents(extractionProject: ExtractionProject): DraftComponent[] {
  return extractionProject.moduleContexts.flatMap((moduleContext) =>
    extractComponents(
      moduleContext.project,
      moduleContext.files,
      extractionProject.resolvedConfig,
      matchesGlob,
      extractionProject.configDir,
    ),
  )
}
