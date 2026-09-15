import { describe, expect, it } from 'vitest'
import { applyCodeExtractionToBuilder } from './apply-code-extraction-to-builder'
import { builder, component } from '../__fixtures__/workflow-fixtures'
import { ExtractedLink } from '../connection-detection/extracted-link'
import { mustBeDefined } from '../../__fixtures__/missing-test-fixture-error'

function link(from: string, to: string, type: 'sync' | 'async'): ExtractedLink {
  return ExtractedLink.parse({ source: from, target: to, type })
}

const allComponentTypes = [
  component('ui', 'Home', { route: '/home' }),
  component('api', 'GetOrders', { apiType: 'REST' }),
  component('useCase', 'PlaceOrder'),
  component('domainOp', 'Order', { operationName: 'place' }),
  component('event', 'OrderPlaced', { eventName: 'OrderPlaced' }),
  component('eventHandler', 'OnOrderPlaced', { subscribedEvents: ['OrderPlaced'] }),
  component('scheduledJob', 'NightlyJob'),
  component('ui', 'Broken'),
]

function twoComponentIds(): readonly [string, string] {
  const target = builder()
  applyCodeExtractionToBuilder(
    target,
    'shop',
    [component('useCase', 'PlaceOrder'), component('useCase', 'ShipOrder')],
    [],
    [],
  )
  const first = mustBeDefined(target.components()[0], 'first component')
  const second = mustBeDefined(target.components()[1], 'second component')
  return [first.id, second.id]
}

describe('applyCodeExtractionToBuilder', () => {
  it('adds each component type and skips definitions that cannot be parsed', () => {
    const target = builder()
    target.defineCustomType({ name: 'scheduledJob' })

    const warnings = applyCodeExtractionToBuilder(target, 'shop', allComponentTypes, [], [])

    expect(warnings).toStrictEqual([])
    expect(target.components()).toHaveLength(7)
  })

  it('upserts components that already exist', () => {
    const target = builder()
    target.defineCustomType({ name: 'scheduledJob' })
    applyCodeExtractionToBuilder(target, 'shop', allComponentTypes, [], [])

    applyCodeExtractionToBuilder(target, 'shop', allComponentTypes, [], [])

    expect(target.components()).toHaveLength(7)
  })

  it('adds a resolved link and upserts a repeated link', () => {
    const target = builder()
    const [sourceId, targetId] = twoComponentIds()
    applyCodeExtractionToBuilder(
      target,
      'shop',
      [component('useCase', 'PlaceOrder'), component('useCase', 'ShipOrder')],
      [],
      [],
    )

    applyCodeExtractionToBuilder(target, 'shop', [], [link(sourceId, targetId, 'sync')], [])
    applyCodeExtractionToBuilder(target, 'shop', [], [link(sourceId, targetId, 'sync')], [])

    expect(target.links()).toHaveLength(1)
  })

  it('keeps a located link distinct and skips uncertain links', () => {
    const target = builder()
    const [sourceId, targetId] = twoComponentIds()
    applyCodeExtractionToBuilder(
      target,
      'shop',
      [component('useCase', 'PlaceOrder'), component('useCase', 'ShipOrder')],
      [],
      [],
    )
    const located = ExtractedLink.parse({
      source: sourceId,
      target: targetId,
      sourceLocation: { repository: 'shop', filePath: 'a.ts' },
    })
    applyCodeExtractionToBuilder(target, 'shop', [], [located], [])
    const uncertain = ExtractedLink.parse({
      source: sourceId,
      target: targetId,
      type: 'async',
      _uncertain: 'unresolved',
    })
    applyCodeExtractionToBuilder(target, 'shop', [], [uncertain], [])

    expect(target.links()).toHaveLength(1)
  })

  it('applies external links and returns their warnings', () => {
    const target = builder()
    applyCodeExtractionToBuilder(target, 'shop', [component('useCase', 'PlaceOrder')], [], [])
    const source = mustBeDefined(target.components()[0], 'source component')
    const sourceId = source.id

    const warnings = applyCodeExtractionToBuilder(
      target,
      'shop',
      [],
      [],
      [
        { source: sourceId, target: { name: 'example', url: 'https://example.test' } },
        { source: sourceId, target: { name: 'other', url: 'https://other.test' }, type: 'sync', description: 'x' },
        {
          source: sourceId,
          target: { name: 'located', url: 'https://located.test' },
          description: 'y',
          sourceLocation: { repository: 'shop', filePath: 'a.ts' },
        },
      ],
    )

    expect(warnings).toStrictEqual([])
    expect(target.externalLinks()).toHaveLength(3)
  })
})
