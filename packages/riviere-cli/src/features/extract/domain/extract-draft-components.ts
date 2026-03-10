import type { ResolvedExtractionConfig } from '@living-architecture/riviere-extract-config'
import {
  extractComponents,
  matchesGlob,
  type DraftComponent,
} from '@living-architecture/riviere-extract-ts'
import type { ModuleContext } from './module-context'

/** @riviere-role domain-service */
export function extractDraftComponents(
  moduleContexts: ModuleContext[],
  resolvedConfig: ResolvedExtractionConfig,
  configDir: string,
): DraftComponent[] {
  return moduleContexts.flatMap((ctx) =>
    extractComponents(ctx.project, ctx.files, resolvedConfig, matchesGlob, configDir),
  )
}
