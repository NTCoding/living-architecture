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
        name: 'passes when @APIContainer class has route and method with literal values',
        code: `
          @APIContainer
          class OrderController {
            readonly route = '/orders'
            readonly method = 'GET'
            handle() {}
          }
        `,
      },
      {
        name: 'ignores classes without @APIContainer decorator',
        code: `
          class SomeOtherClass {
            doSomething() {}
          }
        `,
      },
      {
        name: 'ignores classes with different decorator',
        code: `
          @UseCase
          class SomeOtherClass {
            doSomething() {}
          }
        `,
      },
      {
        name: 'passes with all valid HTTP methods',
        code: `
          @APIContainer
          class GetController {
            readonly route = '/get'
            readonly method = 'GET'
            handle() {}
          }
          @APIContainer
          class PostController {
            readonly route = '/post'
            readonly method = 'POST'
            handle() {}
          }
          @APIContainer
          class PutController {
            readonly route = '/put'
            readonly method = 'PUT'
            handle() {}
          }
          @APIContainer
          class PatchController {
            readonly route = '/patch'
            readonly method = 'PATCH'
            handle() {}
          }
          @APIContainer
          class DeleteController {
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
          @APIContainer
          class OrderController {
            readonly method = 'GET'
            handle() {}
          }
        `,
        errors: [missingRouteError('OrderController')],
      },
      {
        name: 'reports error when method property is missing',
        code: `
          @APIContainer
          class OrderController {
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
          @APIContainer
          class OrderController {
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
          @APIContainer
          class OrderController {
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
          @APIContainer
          class OrderController {
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
          @APIContainer
          class OrderController {
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
          @APIContainer
          class OrderController {
            handle() {}
          }
        `,
        errors: [missingRouteError('OrderController'), missingMethodError('OrderController')],
      },
      {
        name: 'reports error when route is a template literal',
        code: `
          const id = '123'
          @APIContainer
          class OrderController {
            readonly route = \`/orders/\${id}\`
            readonly method = 'GET'
            handle() {}
          }
        `,
        errors: [routeNotLiteralError()],
      },
    ],
  })
})
