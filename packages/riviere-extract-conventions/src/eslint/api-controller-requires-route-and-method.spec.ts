import {
  afterAll, describe, expect, it 
} from 'vitest'
import { RuleTester } from '@typescript-eslint/rule-tester'
import rule from './api-controller-requires-route-and-method.cjs'

RuleTester.afterAll = afterAll
RuleTester.it = it
RuleTester.describe = describe

const ruleTester = new RuleTester()

const missingRouteError = (className: string) => ({
  messageId: 'missingRoute' as const,
  data: { className },
})

const missingMethodError = (className: string) => ({
  messageId: 'missingMethod' as const,
  data: { className },
})

const routeNotLiteralError = () => ({ messageId: 'routeNotLiteral' as const })

const methodNotLiteralError = () => ({ messageId: 'methodNotLiteral' as const })

const invalidHttpMethodError = (className: string, value: string) => ({
  messageId: 'invalidHttpMethod' as const,
  data: {
    className,
    value,
  },
})

describe('api-controller-requires-route-and-method', () => {
  it('is a valid ESLint rule', () => {
    expect(rule).toBeDefined()
  })

  ruleTester.run('api-controller-requires-route-and-method', rule, {
    valid: [
      {
        name: 'passes when class has route and method with literal values',
        code: `
          class OrderController implements APIControllerDef {
            readonly route = '/orders'
            readonly method = 'GET'
            handle() {}
          }
        `,
      },
      {
        name: 'ignores classes not implementing APIControllerDef',
        code: `
          class SomeOtherClass {
            doSomething() {}
          }
        `,
      },
      {
        name: 'passes when class implements multiple interfaces including APIControllerDef',
        code: `
          class OrderController implements Serializable, APIControllerDef {
            readonly route = '/orders'
            readonly method = 'POST'
            handle() {}
          }
        `,
      },
      {
        name: 'passes with all valid HTTP methods',
        code: `
          class GetController implements APIControllerDef {
            readonly route = '/get'
            readonly method = 'GET'
            handle() {}
          }
          class PostController implements APIControllerDef {
            readonly route = '/post'
            readonly method = 'POST'
            handle() {}
          }
          class PutController implements APIControllerDef {
            readonly route = '/put'
            readonly method = 'PUT'
            handle() {}
          }
          class PatchController implements APIControllerDef {
            readonly route = '/patch'
            readonly method = 'PATCH'
            handle() {}
          }
          class DeleteController implements APIControllerDef {
            readonly route = '/delete'
            readonly method = 'DELETE'
            handle() {}
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'reports error when route property is missing',
        code: `
          class OrderController implements APIControllerDef {
            readonly method = 'GET'
            handle() {}
          }
        `,
        errors: [missingRouteError('OrderController')],
      },
      {
        name: 'reports error when method property is missing',
        code: `
          class OrderController implements APIControllerDef {
            readonly route = '/orders'
            handle() {}
          }
        `,
        errors: [missingMethodError('OrderController')],
      },
      {
        name: 'reports error when route is not a literal (variable reference)',
        code: `
          const ROUTE = '/orders'
          class OrderController implements APIControllerDef {
            readonly route = ROUTE
            readonly method = 'GET'
            handle() {}
          }
        `,
        errors: [routeNotLiteralError()],
      },
      {
        name: 'reports error when method is an enum value',
        code: `
          class OrderController implements APIControllerDef {
            readonly route = '/orders'
            readonly method = HttpMethod.GET
            handle() {}
          }
        `,
        errors: [methodNotLiteralError()],
      },
      {
        name: 'reports error when method is invalid HTTP method',
        code: `
          class OrderController implements APIControllerDef {
            readonly route = '/orders'
            readonly method = 'INVALID'
            handle() {}
          }
        `,
        errors: [invalidHttpMethodError('OrderController', 'INVALID')],
      },
      {
        name: 'reports error when route is a function call',
        code: `
          class OrderController implements APIControllerDef {
            readonly route = getRoute()
            readonly method = 'GET'
            handle() {}
          }
        `,
        errors: [routeNotLiteralError()],
      },
      {
        name: 'reports multiple errors when both route and method are missing',
        code: `
          class OrderController implements APIControllerDef {
            handle() {}
          }
        `,
        errors: [missingRouteError('OrderController'), missingMethodError('OrderController')],
      },
    ],
  })
})
