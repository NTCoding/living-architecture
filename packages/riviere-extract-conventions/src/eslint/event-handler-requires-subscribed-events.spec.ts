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
  it('is a valid ESLint rule', () => {
    expect(rule).toBeDefined()
  })

  ruleTester.run('event-handler-requires-subscribed-events', rule, {
    valid: [
      {
        name: 'passes when class has subscribedEvents with literal array',
        code: `
          class OrderHandler implements EventHandlerDef {
            readonly subscribedEvents = ['OrderPlaced', 'OrderCancelled']
            handle() {}
          }
        `,
      },
      {
        name: 'passes with single element array',
        code: `
          class OrderHandler implements EventHandlerDef {
            readonly subscribedEvents = ['OrderPlaced']
            handle() {}
          }
        `,
      },
      {
        name: 'passes with empty array',
        code: `
          class OrderHandler implements EventHandlerDef {
            readonly subscribedEvents = []
            handle() {}
          }
        `,
      },
      {
        name: 'ignores classes not implementing EventHandlerDef',
        code: `
          class SomeOtherClass {
            readonly subscribedEvents = EVENTS
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'reports error when subscribedEvents property is missing',
        code: `
          class OrderHandler implements EventHandlerDef {
            handle() {}
          }
        `,
        errors: [missingSubscribedEventsError('OrderHandler')],
      },
      {
        name: 'reports error when subscribedEvents is not an array (string)',
        code: `
          class OrderHandler implements EventHandlerDef {
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
          class OrderHandler implements EventHandlerDef {
            readonly subscribedEvents = [EVENT]
            handle() {}
          }
        `,
        errors: [subscribedEventsNotLiteralArrayError()],
      },
      {
        name: 'reports error when subscribedEvents is a variable reference',
        code: `
          const EVENTS = ['OrderPlaced']
          class OrderHandler implements EventHandlerDef {
            readonly subscribedEvents = EVENTS
            handle() {}
          }
        `,
        errors: [subscribedEventsNotLiteralArrayError()],
      },
    ],
  })
})
