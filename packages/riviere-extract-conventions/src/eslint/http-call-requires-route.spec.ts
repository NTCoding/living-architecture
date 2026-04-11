import {
  afterAll, describe, expect, it 
} from 'vitest'
import { RuleTester } from '@typescript-eslint/rule-tester'
import rule from './http-call-requires-route.cjs'

RuleTester.afterAll = afterAll
RuleTester.it = it
RuleTester.describe = describe

const ruleTester = new RuleTester()

const missingRouteError = (methodName: string) => ({
  messageId: 'missingRoute' as const,
  data: { methodName },
})

const routeNotLiteralError = (methodName: string) => ({
  messageId: 'routeNotLiteral' as const,
  data: { methodName },
})

const emptyRouteError = (methodName: string) => ({
  messageId: 'emptyRoute' as const,
  data: { methodName },
})

describe('http-call-requires-route', () => {
  it('is a valid ESLint rule', () => {
    expect(rule).toBeDefined()
  })

  ruleTester.run('http-call-requires-route', rule, {
    valid: [
      {
        name: 'ignores methods without HttpCall decorator',
        code: 'class FraudClient { checkFraud() {} }',
      },
      {
        name: 'accepts HttpCall when route is non-empty string literal',
        code: "class FraudClient { @HttpCall('/check') checkFraud() {} }",
      },
      {
        name: 'ignores non-call decorators that are not HttpCall',
        code: 'class FraudClient { @Other checkFraud() {} }',
      },
      {
        name: 'ignores call decorators that are not HttpCall',
        code: "class FraudClient { @Other('/check') checkFraud() {} }",
      },
      {
        name: 'ignores methods with non-identifier keys',
        code: "class FraudClient { @HttpCall('/check') ['checkFraud']() {} }",
      },
    ],
    invalid: [
      {
        name: 'reports when HttpCall has no route argument',
        code: 'class FraudClient { @HttpCall() checkFraud() {} }',
        errors: [missingRouteError('checkFraud')],
      },
      {
        name: 'reports when HttpCall route is not a string literal',
        code: "const ROUTE = '/fraud/check'; class FraudClient { @HttpCall(ROUTE) checkFraud() {} }",
        errors: [routeNotLiteralError('checkFraud')],
      },
      {
        name: 'reports when HttpCall route is an empty string literal',
        code: "class FraudClient { @HttpCall('') checkFraud() {} }",
        errors: [emptyRouteError('checkFraud')],
      },
      {
        name: 'reports when HttpCall decorator is used without call syntax',
        code: 'class FraudClient { @HttpCall checkFraud() {} }',
        errors: [missingRouteError('checkFraud')],
      },
    ],
  })
})
