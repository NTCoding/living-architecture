import { describe, it, expect } from 'vitest'
import { ComponentSummaryStats } from './component-summary-stats'

describe('ComponentSummaryStats', () => {
  it('returns an instance of ComponentSummaryStats from parse()', () => {
    const stats = ComponentSummaryStats.parse({
      componentCount: 0,
      componentsByType: {
        UI: 0,
        API: 0,
        UseCase: 0,
        DomainOp: 0,
        Event: 0,
        EventHandler: 0,
        Custom: 0,
      },
      linkCount: 0,
      externalLinkCount: 0,
      domainCount: 0,
    })

    expect(stats).toBeInstanceOf(ComponentSummaryStats)
  })

  it('stores all fields correctly', () => {
    const stats = ComponentSummaryStats.parse({
      componentCount: 5,
      componentsByType: {
        UI: 1,
        API: 2,
        UseCase: 1,
        DomainOp: 0,
        Event: 0,
        EventHandler: 1,
        Custom: 0,
      },
      linkCount: 3,
      externalLinkCount: 2,
      domainCount: 2,
    })

    expect(stats).toBeInstanceOf(ComponentSummaryStats)
    expect(stats.componentCount).toBe(5)
    expect(stats.linkCount).toBe(3)
    expect(stats.componentsByType.API).toBe(2)
  })

  it('stores zero counts correctly', () => {
    const stats = ComponentSummaryStats.parse({
      componentCount: 0,
      componentsByType: {
        UI: 0,
        API: 0,
        UseCase: 0,
        DomainOp: 0,
        Event: 0,
        EventHandler: 0,
        Custom: 0,
      },
      linkCount: 0,
      externalLinkCount: 0,
      domainCount: 0,
    })

    expect(stats.componentCount).toBe(0)
    expect(stats.linkCount).toBe(0)
    expect(stats.externalLinkCount).toBe(0)
    expect(stats.domainCount).toBe(0)
  })

  it('is not affected by mutations to the source object', () => {
    const source = {
      componentCount: 5,
      componentsByType: {
        UI: 1,
        API: 2,
        UseCase: 1,
        DomainOp: 0,
        Event: 0,
        EventHandler: 1,
        Custom: 0,
      },
      linkCount: 3,
      externalLinkCount: 2,
      domainCount: 2,
    }

    const stats = ComponentSummaryStats.parse(source)
    source.componentsByType.API = 999

    expect(stats.componentsByType.API).toBe(2)
  })
})
