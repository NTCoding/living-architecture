import type { ValidatedModule } from '@living-architecture/riviere-extract-config-published-language'
import type { DraftComponent } from './component-extraction/draft-component'
import { MissingModuleSourceError } from './extraction-errors'
import { moduleOwnsComponent } from './module-owns-component'
import { OrphanedDraftComponentError } from './orphaned-draft-component-error'

/** @riviere-role domain-service */
export function groupDraftsByModule(
  drafts: readonly DraftComponent[],
  modules: readonly ValidatedModule[],
  moduleSources: ReadonlyMap<ValidatedModule, { readonly files: readonly string[] }>,
): Map<string, DraftComponent[]> {
  const grouped = new Map<string, DraftComponent[]>()
  for (const module of modules) {
    const source = moduleSources.get(module)
    if (source === undefined) throw new MissingModuleSourceError(module.name)
    const moduleDrafts = drafts.filter((draft) =>
      moduleOwnsComponent({ component: draft, module, files: source.files }),
    )
    if (moduleDrafts.length > 0) grouped.set(module.name, moduleDrafts)
  }
  const matchedDrafts = new Set([...grouped.values()].flat())
  const unmatchedDrafts = drafts.filter((draft) => !matchedDrafts.has(draft))
  if (unmatchedDrafts.length > 0) {
    throw new OrphanedDraftComponentError(
      [...new Set(unmatchedDrafts.map((draft) => draft.domain))],
      modules.map((module) => module.domain),
      'domains',
    )
  }
  return grouped
}
