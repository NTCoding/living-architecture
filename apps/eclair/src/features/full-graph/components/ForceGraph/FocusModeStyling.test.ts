import { describe, it, expect } from 'vitest'
import { getLinkNodeId } from './FocusModeStyling'
import type { SimulationNode } from '../../types'
import { parseNode } from '@/lib/riviereTestData'
const testSourceLocation = { repository: 'test-repo', filePath: 'src/test.ts' }

describe('FocusModeStyling', () => {

  describe('getLinkNodeId', () => {
    it('returns id string when nodeOrId is a string', () => {
      expect(getLinkNodeId('node-123')).toBe('node-123')
    })

    it('returns id from node object when nodeOrId is a node', () => {
      const node: SimulationNode = {
        id: 'node-456',
        type: 'API',
        apiType: 'other',
        name: 'test',
        domain: 'test',
        originalNode: parseNode({ sourceLocation: testSourceLocation, id: 'node-456', type: 'API', name: 'test', domain: 'test', module: 'test-module' }),
      }

      expect(getLinkNodeId(node)).toBe('node-456')
    })

    it('handles API node type', () => {
      const node: SimulationNode = {
        id: 'test-API',
        type: 'API',
        apiType: 'other',
        name: 'test',
        domain: 'test',
        originalNode: parseNode({ sourceLocation: testSourceLocation, id: 'test-API', type: 'API', name: 'test', domain: 'test', module: 'test-module' }),
      }
      expect(getLinkNodeId(node)).toBe('test-API')
    })

    it('handles Event node type', () => {
      const node: SimulationNode = {
        id: 'test-Event',
        type: 'Event',
        name: 'test',
        domain: 'test',
        originalNode: parseNode({ sourceLocation: testSourceLocation, id: 'test-Event', type: 'Event', name: 'test', domain: 'test', module: 'test-module', eventName: 'TestEvent' }),
      }
      expect(getLinkNodeId(node)).toBe('test-Event')
    })

    it('handles UI node type', () => {
      const node: SimulationNode = {
        id: 'test-UI',
        type: 'UI',
        name: 'test',
        domain: 'test',
        originalNode: parseNode({ sourceLocation: testSourceLocation, id: 'test-UI', type: 'UI', name: 'test', domain: 'test', module: 'test-module', route: '/test' }),
      }
      expect(getLinkNodeId(node)).toBe('test-UI')
    })

    it('preserves special characters in id', () => {
      expect(getLinkNodeId('node-with-dashes')).toBe('node-with-dashes')
      expect(getLinkNodeId('node_with_underscores')).toBe('node_with_underscores')
      expect(getLinkNodeId('node:with:colons')).toBe('node:with:colons')
    })
  })
})
