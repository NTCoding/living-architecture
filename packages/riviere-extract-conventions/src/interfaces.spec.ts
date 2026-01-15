import {
  describe, expect, it 
} from 'vitest'
import type {
  APIControllerDef,
  DomainOpContainerDef,
  EventDef,
  EventHandlerDef,
  HttpMethod,
  UIPageDef,
} from './interfaces'

describe('interfaces', () => {
  describe('HttpMethod', () => {
    it('accepts all valid HTTP methods', () => {
      const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

      expect(methods).toHaveLength(5)
    })
  })

  describe('APIControllerDef', () => {
    it('enforces route, method, and handle properties', () => {
      class TestController implements APIControllerDef {
        readonly route = '/test'
        readonly method: HttpMethod = 'GET'

        handle(): void {
          // implementation
        }
      }

      const controller = new TestController()

      expect(controller.route).toBe('/test')
      expect(controller.method).toBe('GET')
    })
  })

  describe('EventDef', () => {
    it('enforces readonly type property', () => {
      class TestEvent implements EventDef {
        readonly type = 'TestOccurred'
      }

      const event = new TestEvent()

      expect(event.type).toBe('TestOccurred')
    })
  })

  describe('EventHandlerDef', () => {
    it('enforces subscribedEvents array and handle method', () => {
      class TestHandler implements EventHandlerDef {
        readonly subscribedEvents = ['EventA', 'EventB'] as const

        handle(): void {
          // implementation
        }
      }

      const handler = new TestHandler()

      expect(handler.subscribedEvents).toStrictEqual(['EventA', 'EventB'])
    })
  })

  describe('UIPageDef', () => {
    it('enforces readonly route property', () => {
      class TestPage implements UIPageDef {
        readonly route = '/dashboard'
      }

      const page = new TestPage()

      expect(page.route).toBe('/dashboard')
    })
  })

  describe('DomainOpContainerDef', () => {
    it('allows class with brand property as marker interface', () => {
      class TestContainer implements DomainOpContainerDef {
        readonly __brand = 'DomainOpContainerDef' as const

        doSomething(): string {
          return 'done'
        }
      }

      const container = new TestContainer()

      expect(container.doSomething()).toBe('done')
      expect(container.__brand).toBe('DomainOpContainerDef')
    })
  })
})
