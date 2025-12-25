import { RiviereQuery } from './RiviereQuery.js'
import { createMinimalValidGraph, createAPIComponent } from './graph-test-builders.js'

describe('RiviereQuery.traceFlow()', () => {
  it('throws error when startComponentId does not exist', () => {
    const query = new RiviereQuery(createMinimalValidGraph())

    expect(() => query.traceFlow('nonexistent:id')).toThrow(/component 'nonexistent:id' does not exist/)
  })

  it('returns only starting component when component is isolated', () => {
    const query = new RiviereQuery(createMinimalValidGraph())

    const result = query.traceFlow('test:mod:ui:page')

    expect(result.componentIds).toEqual(['test:mod:ui:page'])
    expect(result.linkIds).toEqual([])
  })

  it('returns downstream components when starting from source', () => {
    const graph = createMinimalValidGraph()
    graph.components.push(createAPIComponent({ id: 'test:api:create', name: 'Create', domain: 'test' }))
    graph.links = [{ source: 'test:mod:ui:page', target: 'test:api:create' }]
    const query = new RiviereQuery(graph)

    const result = query.traceFlow('test:mod:ui:page')

    expect(result.componentIds.sort()).toEqual(['test:api:create', 'test:mod:ui:page'])
    expect(result.linkIds).toEqual(['test:mod:ui:page->test:api:create'])
  })

  it('returns upstream components when starting from target', () => {
    const graph = createMinimalValidGraph()
    graph.components.push(createAPIComponent({ id: 'test:api:create', name: 'Create', domain: 'test' }))
    graph.links = [{ source: 'test:mod:ui:page', target: 'test:api:create' }]
    const query = new RiviereQuery(graph)

    const result = query.traceFlow('test:api:create')

    expect(result.componentIds.sort()).toEqual(['test:api:create', 'test:mod:ui:page'])
    expect(result.linkIds).toEqual(['test:mod:ui:page->test:api:create'])
  })

  it('returns all branches when flow branches', () => {
    const graph = createMinimalValidGraph()
    graph.components.push(
      createAPIComponent({ id: 'test:api:a', name: 'API A', domain: 'test' }),
      createAPIComponent({ id: 'test:api:b', name: 'API B', domain: 'test' }),
    )
    graph.links = [
      { source: 'test:mod:ui:page', target: 'test:api:a' },
      { source: 'test:mod:ui:page', target: 'test:api:b' },
    ]
    const query = new RiviereQuery(graph)

    const result = query.traceFlow('test:mod:ui:page')

    expect(result.componentIds.sort()).toEqual(['test:api:a', 'test:api:b', 'test:mod:ui:page'])
    expect(result.linkIds.sort()).toEqual(['test:mod:ui:page->test:api:a', 'test:mod:ui:page->test:api:b'])
  })

  it('handles cycles without infinite loop', () => {
    const graph = createMinimalValidGraph()
    graph.components.push(createAPIComponent({ id: 'test:api:a', name: 'API A', domain: 'test' }))
    graph.links = [
      { source: 'test:mod:ui:page', target: 'test:api:a' },
      { source: 'test:api:a', target: 'test:mod:ui:page' },
    ]
    const query = new RiviereQuery(graph)

    const result = query.traceFlow('test:mod:ui:page')

    expect(result.componentIds.sort()).toEqual(['test:api:a', 'test:mod:ui:page'])
    expect(result.linkIds.sort()).toEqual(['test:api:a->test:mod:ui:page', 'test:mod:ui:page->test:api:a'])
  })

  it('only includes components in connected subgraph', () => {
    const graph = createMinimalValidGraph()
    graph.metadata.domains['other'] = { description: 'Other', systemType: 'domain' }
    graph.components.push(
      createAPIComponent({ id: 'test:api:a', name: 'API A', domain: 'test' }),
      createAPIComponent({ id: 'other:api:x', name: 'API X', domain: 'other' }),
      createAPIComponent({ id: 'other:api:y', name: 'API Y', domain: 'other' }),
    )
    graph.links = [
      { source: 'test:mod:ui:page', target: 'test:api:a' },
      { source: 'other:api:x', target: 'other:api:y' },
    ]
    const query = new RiviereQuery(graph)

    const result = query.traceFlow('test:mod:ui:page')

    expect(result.componentIds.sort()).toEqual(['test:api:a', 'test:mod:ui:page'])
    expect(result.linkIds).toEqual(['test:mod:ui:page->test:api:a'])
  })

  it('traces full chain when starting from middle', () => {
    const graph = createMinimalValidGraph()
    graph.components.push(
      createAPIComponent({ id: 'test:api:b', name: 'API B', domain: 'test' }),
      createAPIComponent({ id: 'test:api:c', name: 'API C', domain: 'test' }),
    )
    graph.links = [
      { source: 'test:mod:ui:page', target: 'test:api:b' },
      { source: 'test:api:b', target: 'test:api:c' },
    ]
    const query = new RiviereQuery(graph)

    const result = query.traceFlow('test:api:b')

    expect(result.componentIds.sort()).toEqual(['test:api:b', 'test:api:c', 'test:mod:ui:page'])
    expect(result.linkIds.sort()).toEqual(['test:api:b->test:api:c', 'test:mod:ui:page->test:api:b'])
  })

  it('uses explicit link ID when provided', () => {
    const graph = createMinimalValidGraph()
    graph.components.push(createAPIComponent({ id: 'test:api:a', name: 'API A', domain: 'test' }))
    graph.links = [{ id: 'custom-link-id', source: 'test:mod:ui:page', target: 'test:api:a' }]
    const query = new RiviereQuery(graph)

    const result = query.traceFlow('test:mod:ui:page')

    expect(result.linkIds).toEqual(['custom-link-id'])
  })

  it('traverses full chain beyond immediate neighbors', () => {
    const graph = createMinimalValidGraph()
    graph.components.push(
      createAPIComponent({ id: 'test:api:b', name: 'API B', domain: 'test' }),
      createAPIComponent({ id: 'test:api:c', name: 'API C', domain: 'test' }),
      createAPIComponent({ id: 'test:api:d', name: 'API D', domain: 'test' }),
    )
    graph.links = [
      { source: 'test:mod:ui:page', target: 'test:api:b' },
      { source: 'test:api:b', target: 'test:api:c' },
      { source: 'test:api:c', target: 'test:api:d' },
    ]
    const query = new RiviereQuery(graph)

    const result = query.traceFlow('test:api:b')

    expect(result.componentIds.sort()).toEqual([
      'test:api:b',
      'test:api:c',
      'test:api:d',
      'test:mod:ui:page',
    ])
    expect(result.linkIds.sort()).toEqual([
      'test:api:b->test:api:c',
      'test:api:c->test:api:d',
      'test:mod:ui:page->test:api:b',
    ])
  })
})
