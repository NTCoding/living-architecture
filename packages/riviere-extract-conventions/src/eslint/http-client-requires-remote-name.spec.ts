import {
  afterAll, describe, expect, it 
} from 'vitest'
import { RuleTester } from '@typescript-eslint/rule-tester'
import rule from './http-client-requires-remote-name.cjs'

RuleTester.afterAll = afterAll
RuleTester.it = it
RuleTester.describe = describe

const ruleTester = new RuleTester()

const missingServiceNameError = (className: string) => ({
  messageId: 'missingServiceName' as const,
  data: { className },
})

const serviceNameNotLiteralError = (className: string) => ({
  messageId: 'serviceNameNotLiteral' as const,
  data: { className },
})

const emptyServiceNameError = (className: string) => ({
  messageId: 'emptyServiceName' as const,
  data: { className },
})

describe('http-client-requires-service-name', () => {
  it('is a valid ESLint rule', () => {
    expect(rule).toBeDefined()
  })

  ruleTester.run('http-client-requires-service-name', rule, {
    valid: [
      {
        name: 'ignores classes without HttpClient decorator',
        code: 'class CheckoutGateway {}',
      },
      {
        name: 'ignores classes with non-call decorators that are not HttpClient',
        code: '@SomeDecorator class CheckoutGateway {}',
      },
      {
        name: 'ignores classes with call decorators that are not HttpClient',
        code: '@SomeDecorator() class CheckoutGateway {}',
      },
      {
        name: 'accepts HttpClient when service name is non-empty string literal',
        code: "@HttpClient('Fraud Service') class FraudClient {}",
      },
      {
        name: 'ignores anonymous default export classes',
        code: 'export default class {}',
      },
    ],
    invalid: [
      {
        name: 'reports error when HttpClient has no service name argument',
        code: '@HttpClient() class FraudClient {}',
        errors: [missingServiceNameError('FraudClient')],
      },
      {
        name: 'reports error when HttpClient argument is not a string literal',
        code: "const REMOTE = 'Fraud Service'; @HttpClient(REMOTE) class FraudClient {}",
        errors: [serviceNameNotLiteralError('FraudClient')],
      },
      {
        name: 'reports error when HttpClient argument is an empty string literal',
        code: "@HttpClient('') class FraudClient {}",
        errors: [emptyServiceNameError('FraudClient')],
      },
      {
        name: 'reports error when HttpClient decorator is used without call syntax',
        code: '@HttpClient class FraudClient {}',
        errors: [missingServiceNameError('FraudClient')],
      },
    ],
  })
})
