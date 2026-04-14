import {
  afterAll, describe, expect, it 
} from 'vitest'
import { RuleTester } from '@typescript-eslint/rule-tester'
import rule from './ui-page-requires-route.cjs'

RuleTester.afterAll = afterAll
RuleTester.it = it
RuleTester.describe = describe

const ruleTester = new RuleTester()

const missingRouteError = (className: string) => ({
  messageId: 'missingRoute' as const,
  data: { className },
})

const routeNotLiteralError = () => ({ messageId: 'routeNotLiteral' as const })

describe('ui-page-requires-route', () => {
  it('is a valid ESLint rule', () => {
    expect(rule).toBeDefined()
  })

  ruleTester.run('ui-page-requires-route', rule, {
    valid: [
      {
        name: 'passes when @UI class has route with literal value',
        code: `
          @UI
          class DashboardPage {
            readonly route = '/dashboard'
          }
        `,
      },
      {
        name: 'ignores classes without @UI decorator',
        code: `
          class SomeOtherClass {
            readonly route = ROUTE
          }
        `,
      },
      {
        name: 'ignores classes with different decorator',
        code: `
          @UseCase
          class SomeOtherClass {
            readonly route = '/dashboard'
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'reports error when @UI class is missing route property',
        code: `
          @UI
          class DashboardPage {
            readonly title = 'Dashboard'
          }
        `,
        errors: [missingRouteError('DashboardPage')],
      },
      {
        name: 'reports error when route is not a literal (variable reference)',
        code: `
          const ROUTE = '/dashboard'
          @UI
          class DashboardPage {
            readonly route = ROUTE
          }
        `,
        errors: [routeNotLiteralError()],
      },
      {
        name: 'reports error when route is a template literal',
        code: `
          @UI
          class DashboardPage {
            readonly route = \`/dashboard/\${userId}\`
          }
        `,
        errors: [routeNotLiteralError()],
      },
    ],
  })
})
