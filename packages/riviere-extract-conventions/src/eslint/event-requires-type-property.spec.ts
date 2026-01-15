import {
  afterAll, describe, expect, it 
} from 'vitest'
import { RuleTester } from '@typescript-eslint/rule-tester'
import rule from './event-requires-type-property.cjs'

RuleTester.afterAll = afterAll
RuleTester.it = it
RuleTester.describe = describe

const ruleTester = new RuleTester()

const missingTypeError = (className: string) => ({
  messageId: 'missingType' as const,
  data: { className },
})

const typeNotLiteralError = () => ({ messageId: 'typeNotLiteral' as const })

describe('event-requires-type-property', () => {
  it('is a valid ESLint rule', () => {
    expect(rule).toBeDefined()
  })

  ruleTester.run('event-requires-type-property', rule, {
    valid: [
      {
        name: 'passes when class has type with literal value',
        code: `
          class OrderPlaced implements EventDef {
            readonly type = 'OrderPlaced'
          }
        `,
      },
      {
        name: 'ignores classes not implementing EventDef',
        code: `
          class SomeOtherClass {
            readonly type = 'NotAnEvent'
          }
        `,
      },
      {
        name: 'ignores classes implementing different qualified interface',
        code: `
          class SomeOtherClass implements Domain.OtherDef {
            readonly type = 'NotAnEvent'
          }
        `,
      },
      {
        name: 'passes when class implements multiple interfaces including EventDef',
        code: `
          class OrderPlaced implements Serializable, EventDef {
            readonly type = 'OrderPlaced'
          }
        `,
      },
      {
        name: 'passes when class implements qualified interface name',
        code: `
          class OrderPlaced implements Domain.EventDef {
            readonly type = 'OrderPlaced'
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'reports error when type property is missing',
        code: `
          class OrderPlaced implements EventDef {
            readonly orderId = '123'
          }
        `,
        errors: [missingTypeError('OrderPlaced')],
      },
      {
        name: 'reports error when type is not a literal (variable reference)',
        code: `
          const EVENT_TYPE = 'OrderPlaced'
          class OrderPlaced implements EventDef {
            readonly type = EVENT_TYPE
          }
        `,
        errors: [typeNotLiteralError()],
      },
      {
        name: 'reports error when type is an enum value',
        code: `
          class OrderPlaced implements EventDef {
            readonly type = EventTypes.OrderPlaced
          }
        `,
        errors: [typeNotLiteralError()],
      },
      {
        name: 'reports error when type is a template literal',
        code: `
          class OrderPlaced implements EventDef {
            readonly type = \`OrderPlaced\`
          }
        `,
        errors: [typeNotLiteralError()],
      },
    ],
  })
})
