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
        name: 'passes when @Event class has type with literal value',
        code: `
          @Event
          class OrderPlaced {
            readonly type = 'OrderPlaced'
          }
        `,
      },
      {
        name: 'ignores classes without @Event decorator',
        code: `
          class SomeOtherClass {
            readonly type = 'NotAnEvent'
          }
        `,
      },
      {
        name: 'ignores classes with different decorator',
        code: `
          @UseCase
          class SomeOtherClass {
            readonly type = 'NotAnEvent'
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'reports error when @Event class is missing type property',
        code: `
          @Event
          class OrderPlaced {
            readonly orderId = '123'
          }
        `,
        errors: [missingTypeError('OrderPlaced')],
      },
      {
        name: 'reports error when type is not a literal (variable reference)',
        code: `
          const EVENT_TYPE = 'OrderPlaced'
          @Event
          class OrderPlaced {
            readonly type = EVENT_TYPE
          }
        `,
        errors: [typeNotLiteralError()],
      },
      {
        name: 'reports error when type is an enum value',
        code: `
          @Event
          class OrderPlaced {
            readonly type = EventTypes.OrderPlaced
          }
        `,
        errors: [typeNotLiteralError()],
      },
      {
        name: 'reports error when type is a template literal',
        code: `
          @Event
          class OrderPlaced {
            readonly type = \`OrderPlaced\`
          }
        `,
        errors: [typeNotLiteralError()],
      },
    ],
  })
})
