import type {
  ArchitectureItem,
  ArchitectureLayerChanges,
} from '@living-architecture/living-documentation-use-cases/features/documentation/queries/pull-request-architecture-diff'
import {
  renderArchitectureChangeCount,
  renderArchitectureCodeSpan,
  renderArchitectureHtmlText,
} from './architecture-review-markdown'

type LayerChanges = ArchitectureLayerChanges

const LAYER_LABELS: Readonly<Record<'domain' | 'entrypoints' | 'use-cases', string>> = {
  domain: 'Domain',
  entrypoints: 'Entrypoints',
  'use-cases': 'Use cases',
}

/** @riviere-role cli-output-formatter */
export function renderArchitectureDesignTradeOffs(changes: {
  readonly domain: LayerChanges
  readonly entrypoints: LayerChanges
  readonly 'use-cases': LayerChanges
}): readonly string[] {
  const items = layerNames.flatMap((layer) =>
    changes[layer].added.items.flatMap((item) =>
      item.designTradeOff === undefined ? [] : [{ item, layer, tradeOff: item.designTradeOff }],
    ),
  )
  if (items.length === 0) return []
  return [
    `### ⚠️ Design trade-offs (${renderArchitectureChangeCount(items.length, 0)})`,
    '',
    'Each of these declares `@riviere-design-trade-off`, a deliberate deviation from a role principle. **Human approval is required before merge.**',
    '',
    ...items.flatMap(({ item, layer, tradeOff }) => renderTradeOffItem(item, layer, tradeOff)),
  ]
}

function renderTradeOffItem(
  item: ArchitectureItem,
  layer: 'domain' | 'entrypoints' | 'use-cases',
  tradeOff: string,
): readonly string[] {
  return [
    `- <span>${renderArchitectureHtmlText(item.name)}</span> (${renderArchitectureHtmlText(item.role)}, ${renderArchitectureCodeSpan(LAYER_LABELS[layer])})`,
    `    - ${renderArchitectureHtmlText(tradeOff)}`,
    '',
  ]
}

const layerNames = ['entrypoints', 'use-cases', 'domain'] as const
