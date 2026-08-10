import type { DraftComponent } from '@living-architecture/riviere-extract-ts'

interface ComponentIdentity {
  readonly type: string
  readonly name: string
  readonly domain: string
}

interface CategorizedComponents {
  readonly added: readonly ComponentIdentity[]
  readonly modified: readonly ComponentIdentity[]
  readonly removed: readonly ComponentIdentity[]
}

function componentKey(component: ComponentIdentity): string {
  return `${component.domain}:${component.type}:${component.name}`
}

function toComponentSummary(component: DraftComponent): ComponentIdentity {
  return {
    type: component.type,
    name: component.name,
    domain: component.domain,
  }
}

/** @riviere-role cli-output-formatter */
export function categorizeComponents(
  current: readonly DraftComponent[],
  baseline: readonly DraftComponent[] | undefined,
): CategorizedComponents {
  if (baseline === undefined) {
    return {
      added: current.map(toComponentSummary),
      modified: [],
      removed: [],
    }
  }

  const baselineKeys = new Set(baseline.map((c) => componentKey(c)))
  const currentKeys = new Set(current.map((c) => componentKey(c)))

  const added = current.filter((c) => !baselineKeys.has(componentKey(c))).map(toComponentSummary)
  const removed = baseline.filter((c) => !currentKeys.has(componentKey(c))).map(toComponentSummary)

  return {
    added,
    modified: [],
    removed,
  }
}
