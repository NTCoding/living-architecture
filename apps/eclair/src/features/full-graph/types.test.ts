import { describe, expect, test } from 'vitest'
import { NODE_COLORS, NODE_RADII, EDGE_COLORS, getDomainColor } from './types'
import type { Theme } from '@/types/theme'
import type { NodeType } from '@/types/riviere'

describe('graph constants', () => {
  test('NODE_COLORS has all themes', () => {
    expect(NODE_COLORS.stream).toBeDefined()
    expect(NODE_COLORS.voltage).toBeDefined()
    expect(NODE_COLORS.circuit).toBeDefined()
  })

  test('NODE_COLORS has all node types for each theme', () => {
    const nodeTypes: readonly NodeType[] = ['UI', 'API', 'UseCase', 'DomainOp', 'Event', 'EventHandler', 'Custom']
    const themes: readonly Theme[] = ['stream', 'voltage', 'circuit']

    for (const theme of themes) {
      for (const nodeType of nodeTypes) {
        expect(NODE_COLORS[theme][nodeType]).toBeDefined()
      }
    }
  })

  test('NODE_RADII has all node types', () => {
    const nodeTypes: readonly NodeType[] = ['UI', 'API', 'UseCase', 'DomainOp', 'Event', 'EventHandler', 'Custom']

    for (const nodeType of nodeTypes) {
      expect(NODE_RADII[nodeType]).toBeGreaterThan(0)
    }
  })

  test('EDGE_COLORS has sync and async for all themes', () => {
    const themes: readonly Theme[] = ['stream', 'voltage', 'circuit']

    for (const theme of themes) {
      expect(EDGE_COLORS[theme].sync).toBeDefined()
      expect(EDGE_COLORS[theme].async).toBeDefined()
    }
  })
})

describe('External node colors', () => {
  test('uses light slate color for External nodes in stream theme', () => {
    expect(NODE_COLORS.stream.External).toBe('#94A3B8')
  })

  test('uses light slate color for External nodes in voltage theme', () => {
    expect(NODE_COLORS.voltage.External).toBe('#94A3B8')
  })

  test('uses gray color for External nodes in circuit theme', () => {
    expect(NODE_COLORS.circuit.External).toBe('#9CA3AF')
  })

  test('External color is distinct from Event color', () => {
    expect(NODE_COLORS.stream.External).not.toBe(NODE_COLORS.stream.Event)
  })
})

describe('getDomainColor', () => {
  test('returns consistent color for same domain', () => {
    const domains = ['orders', 'shipping', 'inventory']
    const color1 = getDomainColor('orders', domains)
    const color2 = getDomainColor('orders', domains)
    expect(color1).toBe(color2)
  })

  test('returns different colors for different domains', () => {
    const domains = ['orders', 'shipping', 'inventory']
    const ordersColor = getDomainColor('orders', domains)
    const shippingColor = getDomainColor('shipping', domains)
    expect(ordersColor).not.toBe(shippingColor)
  })

  test('returns fallback color for unknown domain', () => {
    const domains = ['orders', 'shipping']
    const color = getDomainColor('unknown', domains)
    expect(color).toBe('#0F766E')
  })

  test('assigns colors based on sorted domain order', () => {
    const domains1 = ['zebra', 'alpha', 'beta']
    const domains2 = ['beta', 'zebra', 'alpha']
    expect(getDomainColor('alpha', domains1)).toBe(getDomainColor('alpha', domains2))
  })

  test('returns correct color for each palette index 0-9', () => {
    const domains = ['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9']
    const expectedColors = [
      '#0F766E',
      '#7C3AED',
      '#0369A1',
      '#B45309',
      '#4338CA',
      '#0891B2',
      '#6D28D9',
      '#0E7490',
      '#4F46E5',
      '#047857',
    ]
    domains.forEach((domain, i) => {
      const expected = expectedColors[i]
      if (expected === undefined) throw new Error(`Missing expected color at index ${i}`)
      expect(getDomainColor(domain, domains)).toBe(expected)
    })
  })

  test('wraps around palette for more than 10 domains', () => {
    const domains = ['d00', 'd01', 'd02', 'd03', 'd04', 'd05', 'd06', 'd07', 'd08', 'd09', 'd10']
    const eleventhDomain = domains[10]
    if (eleventhDomain === undefined) throw new Error('Missing domain')
    const color = getDomainColor(eleventhDomain, domains)
    expect(color).toBe('#0F766E')
  })
})
