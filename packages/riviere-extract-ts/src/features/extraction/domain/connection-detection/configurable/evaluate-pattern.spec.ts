import {
  describe, it, expect 
} from 'vitest'
import type { ConnectionCallSiteMatch } from '@living-architecture/riviere-extract-config'
import {
  matchesCallSiteFilter, type CallSiteInfo 
} from './evaluate-pattern'

function callSite(overrides: Partial<CallSiteInfo> = {}): CallSiteInfo {
  return {
    methodName: 'publish',
    receiverType: 'EventBus',
    ...overrides,
  }
}

describe('matchesCallSiteFilter', () => {
  describe('methodName matching', () => {
    it('returns true when methodName matches call site method', () => {
      const where: ConnectionCallSiteMatch = { methodName: 'publish' }

      expect(matchesCallSiteFilter(where, callSite())).toBe(true)
    })

    it('returns false when methodName differs from call site method', () => {
      const where: ConnectionCallSiteMatch = { methodName: 'subscribe' }

      expect(matchesCallSiteFilter(where, callSite())).toBe(false)
    })

    it('returns false when methodName differs by case', () => {
      const where: ConnectionCallSiteMatch = { methodName: 'Publish' }

      expect(matchesCallSiteFilter(where, callSite())).toBe(false)
    })
  })

  describe('receiverType matching', () => {
    it('returns true when receiverType matches call site receiver', () => {
      const where: ConnectionCallSiteMatch = { receiverType: 'EventBus' }

      expect(matchesCallSiteFilter(where, callSite())).toBe(true)
    })

    it('returns false when receiverType differs from call site receiver', () => {
      const where: ConnectionCallSiteMatch = { receiverType: 'MessageQueue' }

      expect(matchesCallSiteFilter(where, callSite())).toBe(false)
    })

    it('returns false when receiverType differs by case', () => {
      const where: ConnectionCallSiteMatch = { receiverType: 'eventbus' }

      expect(matchesCallSiteFilter(where, callSite())).toBe(false)
    })
  })

  describe('combined where clauses', () => {
    it('returns true when both methodName and receiverType match', () => {
      const where: ConnectionCallSiteMatch = {
        methodName: 'publish',
        receiverType: 'EventBus',
      }

      expect(matchesCallSiteFilter(where, callSite())).toBe(true)
    })

    it('returns false when methodName matches but receiverType does not', () => {
      const where: ConnectionCallSiteMatch = {
        methodName: 'publish',
        receiverType: 'MessageQueue',
      }

      expect(matchesCallSiteFilter(where, callSite())).toBe(false)
    })

    it('returns false when receiverType matches but methodName does not', () => {
      const where: ConnectionCallSiteMatch = {
        methodName: 'emit',
        receiverType: 'EventBus',
      }

      expect(matchesCallSiteFilter(where, callSite())).toBe(false)
    })
  })

  describe('decorator-only where clause', () => {
    it('matches any call site when where has only callerHasDecorator', () => {
      const where: ConnectionCallSiteMatch = { callerHasDecorator: ['Controller'] }

      expect(matchesCallSiteFilter(where, callSite())).toBe(true)
    })
  })

  describe('receiver type unavailable on call site', () => {
    it('returns false when where requires receiverType but call site has none', () => {
      const where: ConnectionCallSiteMatch = { receiverType: 'EventBus' }

      expect(matchesCallSiteFilter(where, { methodName: 'publish' })).toBe(false)
    })

    it('returns true when where requires only methodName and call site has no receiver', () => {
      const where: ConnectionCallSiteMatch = { methodName: 'publish' }

      expect(matchesCallSiteFilter(where, { methodName: 'publish' })).toBe(true)
    })
  })
})
