import type { ExtractionConfiguration } from './extraction-configuration'
import { MissingModuleSourceError } from './extraction-errors'
import { OrphanedDraftComponentError } from './orphaned-draft-component-error'
import type { RiviereModule } from './riviere-module'
import type { DraftComponent } from './component-extraction/draft-component'

export function assertEveryConfiguredModuleHasAnEntity(
  configuration: ExtractionConfiguration,
  modules: readonly RiviereModule[],
): void {
  for (const configuredModule of configuration.resolvedConfig.modules) {
    if (!modules.some((module) => module.name() === configuredModule.name))
      throw new MissingModuleSourceError(configuredModule.name)
  }
}

export function assertNoUnassignedDraftComponents(
  drafts: readonly DraftComponent[],
  modules: readonly RiviereModule[],
): void {
  if (drafts.length === 0) return
  throw new OrphanedDraftComponentError(
    [...new Set(drafts.map((draft) => draft.domain))],
    modules.map((module) => module.domain()),
    'domains',
  )
}
