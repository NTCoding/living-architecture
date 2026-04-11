import {
  afterAll, describe, expect, it 
} from 'vitest'
import { RuleTester } from '@typescript-eslint/rule-tester'
import rule from './no-fetch-outside-http-client.cjs'

RuleTester.afterAll = afterAll
RuleTester.it = it
RuleTester.describe = describe

const ruleTester = new RuleTester()

const fetchOutsideHttpClientError = () => ({
  messageId: 'fetchOutsideHttpClient' as const,
  data: { calleeName: 'fetch' },
})

describe('no-fetch-outside-http-client', () => {
  it('is a valid ESLint rule', () => {
    expect(rule).toBeDefined()
  })

  ruleTester.run('no-fetch-outside-http-client', rule, {
    valid: [
      {
        name: 'allows fetch inside HttpClient class method',
        code: "@HttpClient('Fraud Service') class FraudClient { @HttpCall('/check') async check() { await fetch('/x') } }",
      },
      {
        name: 'allows fetch inside identifier HttpClient class decorator syntax',
        code: "@HttpClient class FraudClient { async check() { await fetch('/x') } }",
      },
    ],
    invalid: [
      {
        name: 'reports fetch usage outside HttpClient class',
        code: "async function check() { await fetch('/x') }",
        errors: [fetchOutsideHttpClientError()],
      },
      {
        name: 'reports fetch usage inside class without HttpClient decorator',
        code: "class FraudClient { async check() { await fetch('/x') } }",
        errors: [fetchOutsideHttpClientError()],
      },
    ],
  })
})
