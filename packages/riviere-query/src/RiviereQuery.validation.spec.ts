import { RiviereQuery } from './RiviereQuery'
import { createMinimalValidGraph } from './riviere-graph-fixtures'

describe('RiviereQuery validate()', () => {
  it('returns valid=true for a valid minimal graph', () => {
    const graph = createMinimalValidGraph()
    const query = new RiviereQuery(graph)
    const result = query.validate()
    expect(result.valid).toBe(true)
    expect(result.errors).toStrictEqual([])
  })

  it('returns INVALID_LINK_SOURCE when link references non-existent source', () => {
    const graph = createMinimalValidGraph()
    graph.links = [
      {
        source: 'does-not-exist',
        target: 'test:mod:ui:page',
      },
    ]
    const query = new RiviereQuery(graph)
    const result = query.validate()
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.code).toBe('INVALID_LINK_SOURCE')
    expect(result.errors[0]?.path).toBe('/links/0/source')
  })

  it('returns INVALID_LINK_TARGET when link references non-existent target', () => {
    const graph = createMinimalValidGraph()
    graph.links = [
      {
        source: 'test:mod:ui:page',
        target: 'does-not-exist',
      },
    ]
    const query = new RiviereQuery(graph)
    const result = query.validate()
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.code).toBe('INVALID_LINK_TARGET')
    expect(result.errors[0]?.path).toBe('/links/0/target')
  })

  it('returns multiple errors when graph has multiple issues', () => {
    const graph = createMinimalValidGraph()
    graph.links = [
      {
        source: 'bad-source-1',
        target: 'bad-target-1',
      },
      {
        source: 'bad-source-2',
        target: 'test:mod:ui:page',
      },
    ]
    const query = new RiviereQuery(graph)
    const result = query.validate()
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(3)
  })

  describe('when Custom component references undefined custom type', () => {
    function createGraphWithUndefinedCustomType() {
      const graph = createMinimalValidGraph()
      graph.components.push({
        id: 'test:mod:custom:cronjob',
        type: 'Custom',
        customTypeName: 'CronJob',
        name: 'Update Tracking Cron',
        domain: 'test',
        module: 'mod',
        sourceLocation: {
          repository: 'test-repo',
          filePath: 'cron.ts',
        },
      })
      return graph
    }

    it('returns invalid result', () => {
      const query = new RiviereQuery(createGraphWithUndefinedCustomType())

      const result = query.validate()

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
    })

    it('returns INVALID_TYPE error with path to customTypeName', () => {
      const query = new RiviereQuery(createGraphWithUndefinedCustomType())

      const result = query.validate()

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toMatchObject({
        code: 'INVALID_TYPE',
        path: '/components/1/customTypeName',
      })
      expect(result.errors[0]?.message).toContain('CronJob')
    })
  })

  it('returns valid when Custom type has no requiredProperties', () => {
    const graph = createMinimalValidGraph()
    graph.metadata.customTypes = {SimpleJob: { description: 'A simple job with no required properties' },}
    graph.components.push({
      id: 'test:mod:custom:simplejob',
      type: 'Custom',
      customTypeName: 'SimpleJob',
      name: 'Simple Job',
      domain: 'test',
      module: 'mod',
      sourceLocation: {
        repository: 'test-repo',
        filePath: 'job.ts',
      },
    })
    const query = new RiviereQuery(graph)
    const result = query.validate()
    expect(result.valid).toBe(true)
    expect(result.errors).toStrictEqual([])
  })
})
