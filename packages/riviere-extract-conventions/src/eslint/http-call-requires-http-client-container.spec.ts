import {
  afterAll, describe, expect, it 
} from 'vitest'
import { RuleTester } from '@typescript-eslint/rule-tester'
import rule from './http-call-requires-http-client-container.cjs'

RuleTester.afterAll = afterAll
RuleTester.it = it
RuleTester.describe = describe

const ruleTester = new RuleTester()

const missingContainerError = (className: string, methodName: string) => ({
  messageId: 'missingHttpClientContainer' as const,
  data: {
    className,
    methodName,
  },
})

describe('http-call-requires-http-client-container', () => {
  it('is a valid ESLint rule', () => {
    expect(rule).toBeDefined()
  })

  ruleTester.run('http-call-requires-http-client-container', rule, {
    valid: [
      {
        name: 'passes when class has HttpClient and method has HttpCall',
        code: "@HttpClient('Fraud Service') class FraudClient { @HttpCall('/check') checkFraud() {} }",
      },
      {
        name: 'passes when class uses identifier HttpClient decorator syntax',
        code: "@HttpClient class FraudClient { @HttpCall('/check') checkFraud() {} }",
      },
      {
        name: 'ignores classes without HttpCall methods',
        code: 'class FraudClient { checkFraud() {} }',
      },
      {
        name: 'ignores anonymous default export classes',
        code: "export default class { @HttpCall('/check') checkFraud() {} }",
      },
      {
        name: 'ignores non-method class members',
        code: "class FraudClient { readonly route = '/check' }",
      },
      {
        name: 'ignores methods with non-identifier keys',
        code: "class FraudClient { @HttpCall('/check') ['checkFraud']() {} }",
      },
    ],
    invalid: [
      {
        name: 'reports when class has HttpCall method but no HttpClient decorator',
        code: "class FraudClient { @HttpCall('/check') checkFraud() {} }",
        errors: [missingContainerError('FraudClient', 'checkFraud')],
      },
      {
        name: 'reports when method uses identifier HttpCall decorator and class has no HttpClient',
        code: 'class FraudClient { @HttpCall checkFraud() {} }',
        errors: [missingContainerError('FraudClient', 'checkFraud')],
      },
    ],
  })
})
