import {
  afterAll, describe, expect, it 
} from 'vitest'
import { RuleTester } from '@typescript-eslint/rule-tester'
import rule from './http-client-public-methods-require-http-call.cjs'

RuleTester.afterAll = afterAll
RuleTester.it = it
RuleTester.describe = describe

const ruleTester = new RuleTester()

const missingHttpCallError = (className: string, methodName: string) => ({
  messageId: 'missingHttpCall' as const,
  data: {
    className,
    methodName,
  },
})

describe('http-client-public-methods-require-http-call', () => {
  it('is a valid ESLint rule', () => {
    expect(rule).toBeDefined()
  })

  ruleTester.run('http-client-public-methods-require-http-call', rule, {
    valid: [
      {
        name: 'passes when HttpClient public method has HttpCall',
        code: "@HttpClient('Fraud Service') class FraudClient { @HttpCall('/check') checkFraud() {} }",
      },
      {
        name: 'passes when HttpClient and HttpCall use identifier decorator syntax',
        code: '@HttpClient class FraudClient { @HttpCall checkFraud() {} }',
      },
      {
        name: 'ignores classes without HttpClient decorator',
        code: 'class FraudClient { checkFraud() {} }',
      },
      {
        name: 'ignores anonymous default export classes',
        code: "@HttpClient('Fraud Service') export default class { @HttpCall('/check') checkFraud() {} }",
      },
      {
        name: 'ignores classes decorated with Ignore',
        code: "@Ignore @HttpClient('Fraud Service') class FraudClient { checkFraud() {} }",
      },
      {
        name: 'ignores methods decorated with Ignore',
        code: "@HttpClient('Fraud Service') class FraudClient { @Ignore checkFraud() {} }",
      },
      {
        name: 'ignores constructors in HttpClient classes',
        code: "@HttpClient('Fraud Service') class FraudClient { constructor() {} }",
      },
      {
        name: 'ignores getters and setters in HttpClient classes',
        code: "@HttpClient('Fraud Service') class FraudClient { get status() { return 'ok' } set status(v) {} }",
      },
      {
        name: 'ignores static methods in HttpClient classes',
        code: "@HttpClient('Fraud Service') class FraudClient { static checkFraud() {} }",
      },
      {
        name: 'ignores private and protected methods in HttpClient classes',
        code: "@HttpClient('Fraud Service') class FraudClient { private checkPrivate() {} protected checkProtected() {} }",
      },
      {
        name: 'ignores non-method class members in HttpClient classes',
        code: "@HttpClient('Fraud Service') class FraudClient { readonly route = '/check' }",
      },
      {
        name: 'ignores methods with non-identifier keys in HttpClient classes',
        code: "@HttpClient('Fraud Service') class FraudClient { ['checkFraud']() {} }",
      },
    ],
    invalid: [
      {
        name: 'reports when HttpClient public method is missing HttpCall',
        code: "@HttpClient('Fraud Service') class FraudClient { checkFraud() {} }",
        errors: [missingHttpCallError('FraudClient', 'checkFraud')],
      },
    ],
  })
})
