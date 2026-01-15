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
        name: 'passes when class has route with literal value',
        code: `
          class DashboardPage implements UIPageDef {
            readonly route = '/dashboard'
          }
        `,
      },
      {
        name: 'ignores classes not implementing UIPageDef',
        code: `
          class SomeOtherClass {
            readonly route = ROUTE
          }
        `,
      },
      {
        name: 'passes when class implements multiple interfaces including UIPageDef',
        code: `
          class DashboardPage implements Serializable, UIPageDef {
            readonly route = '/dashboard'
          }
        `,
      },
      {
        name: 'passes when class implements qualified interface name',
        code: `
          class DashboardPage implements Domain.UIPageDef {
            readonly route = '/dashboard'
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'reports error when route property is missing',
        code: `
          class DashboardPage implements UIPageDef {
            readonly title = 'Dashboard'
          }
        `,
        errors: [missingRouteError('DashboardPage')],
      },
      {
        name: 'reports error when route is not a literal (variable reference)',
        code: `
          const ROUTE = '/dashboard'
          class DashboardPage implements UIPageDef {
            readonly route = ROUTE
          }
        `,
        errors: [routeNotLiteralError()],
      },
      {
        name: 'reports error when route is a template literal',
        code: `
          class DashboardPage implements UIPageDef {
            readonly route = \`/dashboard/\${userId}\`
          }
        `,
        errors: [routeNotLiteralError()],
      },
    ],
  })
})
