import {
  afterAll, describe, expect, it 
} from 'vitest'
import { RuleTester } from '@typescript-eslint/rule-tester'
import rule from './event-handler-requires-subscribed-events.cjs'

RuleTester.afterAll = afterAll
RuleTester.it = it
RuleTester.describe = describe

const ruleTester = new RuleTester()

const missingSubscribedEventsError = (className: string) => ({
  messageId: 'missingSubscribedEvents' as const,
  data: { className },
})

const subscribedEventsNotLiteralArrayError = () => ({messageId: 'subscribedEventsNotLiteralArray' as const,})

describe('event-handler-requires-subscribed-events', () => {
  it('exports a valid ESLint rule object', () => {
    expect(rule).toHaveProperty('meta')
    expect(rule).toHaveProperty('create')
  })

  ruleTester.run('event-handler-requires-subscribed-events', rule, {
    valid: [
      {
        name: 'passes when decorated class has subscribedEvents with literal array',
        code: `
          @EventHandlerContainer
          class OrderHandler {
            readonly subscribedEvents = ['OrderPlaced', 'OrderCancelled']
            handle() {}
          }
        `,
      },
      {
        name: 'passes with single element array',
        code: `
          @EventHandlerContainer
          class OrderHandler {
            readonly subscribedEvents = ['OrderPlaced']
            handle() {}
          }
        `,
      },
      {
        name: 'passes with empty array',
        code: `
          @EventHandlerContainer
          class OrderHandler {
            readonly subscribedEvents = []
            handle() {}
          }
        `,
      },
      {
        name: 'ignores classes without EventHandlerContainer decorator',
        code: `
          class SomeOtherClass {
            readonly subscribedEvents = EVENTS
          }
        `,
      },
      {
        name: 'ignores classes with different decorators',
        code: `
          @APIContainer
          class SomeController {
            readonly route = '/orders'
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'reports error when subscribedEvents property is missing from decorated class',
        code: `
          @EventHandlerContainer
          class OrderHandler {
            handle() {}
          }
        `,
        errors: [missingSubscribedEventsError('OrderHandler')],
      },
      {
        name: 'reports error when subscribedEvents is not an array (string)',
        code: `
          @EventHandlerContainer
          class OrderHandler {
            readonly subscribedEvents = 'OrderPlaced'
            handle() {}
          }
        `,
        errors: [subscribedEventsNotLiteralArrayError()],
      },
      {
        name: 'reports error when subscribedEvents array contains variable reference',
        code: `
          const EVENT = 'OrderPlaced'
          @EventHandlerContainer
          class OrderHandler {
            readonly subscribedEvents = [EVENT]
            handle() {}
          }
        `,
        errors: [subscribedEventsNotLiteralArrayError()],
      },
      {
        name: 'reports error when subscribedEvents array contains non-string literals',
        code: `
          @EventHandlerContainer
          class OrderHandler {
            readonly subscribedEvents = [42, true]
            handle() {}
          }
        `,
        errors: [subscribedEventsNotLiteralArrayError()],
      },
      {
        name: 'reports error when subscribedEvents array mixes strings and numbers',
        code: `
          @EventHandlerContainer
          class OrderHandler {
            readonly subscribedEvents = ['OrderPlaced', 42]
            handle() {}
          }
        `,
        errors: [subscribedEventsNotLiteralArrayError()],
      },
      {
        name: 'reports error when subscribedEvents is a variable reference',
        code: `
          const EVENTS = ['OrderPlaced']
          @EventHandlerContainer
          class OrderHandler {
            readonly subscribedEvents = EVENTS
            handle() {}
          }
        `,
        errors: [subscribedEventsNotLiteralArrayError()],
      },
    ],
  })
})
