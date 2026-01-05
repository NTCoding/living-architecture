import { RiviereQuery } from './RiviereQuery'
import {
  createMinimalValidGraph,
  createAPIComponent,
  createUseCaseComponent,
} from './riviere-graph-fixtures'

describe('RiviereQuery.flows()', () => {
  it('returns one flow with entry point as first step at depth 0 when graph has single entry point', () => {
    const query = new RiviereQuery(createMinimalValidGraph())

    const result = query.flows()

    expect(result).toHaveLength(1)
    const flow = result[0]
    if (!flow) throw new Error('Expected flow to exist')
    expect(flow.entryPoint.id).toBe('test:mod:ui:page')
    expect(flow.steps).toHaveLength(1)
    const firstStep = flow.steps[0]
    if (!firstStep) throw new Error('Expected first step to exist')
    expect(firstStep.component.id).toBe('test:mod:ui:page')
    expect(firstStep.linkType).toBeUndefined()
    expect(firstStep.depth).toBe(0)
  })

  it('traces downstream components with increasing depth when entry point has outgoing links', () => {
    const graph = createMinimalValidGraph()
    graph.components.push(
      createAPIComponent({
        id: 'test:api:create',
        name: 'Create API',
        domain: 'test',
      }),
      createUseCaseComponent({
        id: 'test:uc:create',
        name: 'Create UseCase',
        domain: 'test',
      }),
    )
    graph.links = [
      {
        source: 'test:mod:ui:page',
        target: 'test:api:create',
      },
      {
        source: 'test:api:create',
        target: 'test:uc:create',
      },
    ]
    const query = new RiviereQuery(graph)

    const result = query.flows()

    expect(result).toHaveLength(1)
    const flow = result[0]
    if (!flow) throw new Error('Expected flow to exist')
    expect(flow.steps).toHaveLength(3)
    const [step0, step1, step2] = flow.steps
    if (!step0 || !step1 || !step2) throw new Error('Expected 3 steps')
    expect(step0.depth).toBe(0)
    expect(step0.component.id).toBe('test:mod:ui:page')
    expect(step1.depth).toBe(1)
    expect(step1.component.id).toBe('test:api:create')
    expect(step2.depth).toBe(2)
    expect(step2.component.id).toBe('test:uc:create')
  })

  it('sets linkType from outgoing link and undefined for last step', () => {
    const graph = createMinimalValidGraph()
    graph.components.push(
      createAPIComponent({
        id: 'test:api:a',
        name: 'API A',
        domain: 'test',
      }),
      createUseCaseComponent({
        id: 'test:uc:b',
        name: 'UseCase B',
        domain: 'test',
      }),
    )
    graph.links = [
      {
        source: 'test:mod:ui:page',
        target: 'test:api:a',
        type: 'sync',
      },
      {
        source: 'test:api:a',
        target: 'test:uc:b',
        type: 'async',
      },
    ]
    const query = new RiviereQuery(graph)

    const result = query.flows()

    expect(result).toHaveLength(1)
    const flow = result[0]
    if (!flow) throw new Error('Expected flow to exist')
    const [step0, step1, step2] = flow.steps
    if (!step0 || !step1 || !step2) throw new Error('Expected 3 steps')
    expect(step0.linkType).toBe('sync')
    expect(step1.linkType).toBe('async')
    expect(step2.linkType).toBeUndefined()
  })

  it('returns multiple flows when graph has multiple entry points with no incoming links', () => {
    const graph = createMinimalValidGraph()
    graph.components.push(
      createAPIComponent({
        id: 'test:api:endpoint',
        name: 'API Endpoint',
        domain: 'test',
      }),
    )
    const query = new RiviereQuery(graph)

    const result = query.flows()

    expect(result).toHaveLength(2)
    const entryPointIds = result
      .map((f) => f.entryPoint.id)
      .slice()
      .sort((a, b) => a.localeCompare(b))
    expect(entryPointIds).toEqual(['test:api:endpoint', 'test:mod:ui:page'])
  })

  it('visits each component once when graph contains cycle between API and UseCase', () => {
    const graph = createMinimalValidGraph()
    graph.components.push(
      createAPIComponent({
        id: 'test:api:a',
        name: 'API A',
        domain: 'test',
      }),
      createUseCaseComponent({
        id: 'test:uc:b',
        name: 'UseCase B',
        domain: 'test',
      }),
    )
    const cyclicLinks = [
      {
        source: 'test:mod:ui:page',
        target: 'test:api:a',
      },
      {
        source: 'test:api:a',
        target: 'test:uc:b',
      },
      {
        source: 'test:uc:b',
        target: 'test:api:a',
      },
    ]
    graph.links = cyclicLinks
    const query = new RiviereQuery(graph)

    const result = query.flows()

    expect(result).toHaveLength(1)
    const flow = result[0]
    if (!flow) throw new Error('Expected flow to exist')
    expect(flow.steps).toHaveLength(3)
  })

  it('includes all branches when flow branches', () => {
    const graph = createMinimalValidGraph()
    graph.components.push(
      createAPIComponent({
        id: 'test:api:a',
        name: 'API A',
        domain: 'test',
      }),
      createAPIComponent({
        id: 'test:api:b',
        name: 'API B',
        domain: 'test',
      }),
    )
    graph.links = [
      {
        source: 'test:mod:ui:page',
        target: 'test:api:a',
      },
      {
        source: 'test:mod:ui:page',
        target: 'test:api:b',
      },
    ]
    const query = new RiviereQuery(graph)

    const result = query.flows()

    expect(result).toHaveLength(1)
    const flow = result[0]
    if (!flow) throw new Error('Expected flow to exist')
    expect(flow.steps).toHaveLength(3)
    const stepIds = flow.steps
      .map((s) => s.component.id)
      .slice()
      .sort((a, b) => a.localeCompare(b))
    expect(stepIds).toEqual(['test:api:a', 'test:api:b', 'test:mod:ui:page'])
  })

  it('returns only entry point step when link targets non-existent component', () => {
    const graph = createMinimalValidGraph()
    const linkToNonexistentComponent = {
      source: 'test:mod:ui:page',
      target: 'nonexistent:component',
    }
    graph.links = [linkToNonexistentComponent]
    const query = new RiviereQuery(graph)

    const result = query.flows()

    expect(result).toHaveLength(1)
    const flow = result[0]
    if (!flow) throw new Error('Expected flow to exist')
    expect(flow.steps).toHaveLength(1)
    const step = flow.steps[0]
    if (!step) throw new Error('Expected step to exist')
    expect(step.component.id).toBe('test:mod:ui:page')
  })

  it('includes external links in steps when component has external connections', () => {
    const graph = createMinimalValidGraph()
    graph.components.push(
      createAPIComponent({
        id: 'test:api:payment',
        name: 'Payment API',
        domain: 'test',
      }),
    )
    graph.links = [
      {
        source: 'test:mod:ui:page',
        target: 'test:api:payment',
      },
    ]
    graph.externalLinks = [
      {
        source: 'test:api:payment',
        target: {
          name: 'Stripe',
          url: 'https://stripe.com',
        },
        type: 'sync',
      },
    ]
    const query = new RiviereQuery(graph)

    const result = query.flows()

    expect(result).toHaveLength(1)
    const flow = result[0]
    if (!flow) throw new Error('Expected flow to exist')
    const paymentStep = flow.steps.find((s) => s.component.id === 'test:api:payment')
    if (!paymentStep) throw new Error('Expected payment step to exist')
    expect(paymentStep.externalLinks).toHaveLength(1)
    expect(paymentStep.externalLinks[0]?.target.name).toBe('Stripe')
  })

  it('returns empty external links array when step has no external connections', () => {
    const graph = createMinimalValidGraph()
    const query = new RiviereQuery(graph)

    const result = query.flows()

    expect(result).toHaveLength(1)
    const flow = result[0]
    if (!flow) throw new Error('Expected flow to exist')
    const step = flow.steps[0]
    if (!step) throw new Error('Expected step to exist')
    expect(step.externalLinks).toEqual([])
  })

  it('includes multiple external links for same component', () => {
    const graph = createMinimalValidGraph()
    graph.externalLinks = [
      {
        source: 'test:mod:ui:page',
        target: { name: 'Analytics' },
        type: 'async',
      },
      {
        source: 'test:mod:ui:page',
        target: { name: 'CDN' },
        type: 'sync',
      },
    ]
    const query = new RiviereQuery(graph)

    const result = query.flows()

    expect(result).toHaveLength(1)
    const flow = result[0]
    if (!flow) throw new Error('Expected flow to exist')
    const step = flow.steps[0]
    if (!step) throw new Error('Expected step to exist')
    expect(step.externalLinks).toHaveLength(2)
    const names = step.externalLinks
      .map((l) => l.target.name)
      .slice()
      .sort((a, b) => a.localeCompare(b))
    expect(names).toEqual(['Analytics', 'CDN'])
  })
})

describe('RiviereQuery.searchWithFlow()', () => {
  it('returns all IDs as matching and visible when query is empty and returnAllOnEmptyQuery is true', () => {
    const graph = createMinimalValidGraph()
    graph.components.push(
      createAPIComponent({
        id: 'test:api:a',
        name: 'API A',
        domain: 'test',
      }),
    )
    const query = new RiviereQuery(graph)

    const result = query.searchWithFlow('', { returnAllOnEmptyQuery: true })

    expect(result.matchingIds.slice().sort((a, b) => a.localeCompare(b))).toEqual([
      'test:api:a',
      'test:mod:ui:page',
    ])
    expect(result.visibleIds.slice().sort((a, b) => a.localeCompare(b))).toEqual([
      'test:api:a',
      'test:mod:ui:page',
    ])
  })

  it('returns empty arrays when query is empty and returnAllOnEmptyQuery is false', () => {
    const graph = createMinimalValidGraph()
    graph.components.push(
      createAPIComponent({
        id: 'test:api:a',
        name: 'API A',
        domain: 'test',
      }),
    )
    const query = new RiviereQuery(graph)

    const result = query.searchWithFlow('', { returnAllOnEmptyQuery: false })

    expect(result.matchingIds).toEqual([])
    expect(result.visibleIds).toEqual([])
  })

  it('returns matching component ID and all connected component IDs as visible', () => {
    const graph = createMinimalValidGraph()
    graph.components.push(
      createAPIComponent({
        id: 'test:api:a',
        name: 'API A',
        domain: 'test',
      }),
      createUseCaseComponent({
        id: 'test:uc:b',
        name: 'UseCase B',
        domain: 'test',
      }),
    )
    graph.links = [
      {
        source: 'test:mod:ui:page',
        target: 'test:api:a',
      },
      {
        source: 'test:api:a',
        target: 'test:uc:b',
      },
    ]
    const query = new RiviereQuery(graph)

    const result = query.searchWithFlow('API A', { returnAllOnEmptyQuery: false })

    expect(result.matchingIds).toEqual(['test:api:a'])
    expect(result.visibleIds.slice().sort((a, b) => a.localeCompare(b))).toEqual([
      'test:api:a',
      'test:mod:ui:page',
      'test:uc:b',
    ])
  })

  it('returns empty arrays when query matches nothing', () => {
    const query = new RiviereQuery(createMinimalValidGraph())

    const result = query.searchWithFlow('nonexistent', { returnAllOnEmptyQuery: false })

    expect(result.matchingIds).toEqual([])
    expect(result.visibleIds).toEqual([])
  })
})
