import {
  afterAll, describe, expect, it 
} from 'vitest'
import { RuleTester } from '@typescript-eslint/rule-tester'
import rule from './require-component-decorator.cjs'

RuleTester.afterAll = afterAll
RuleTester.it = it
RuleTester.describe = describe

const ruleTester = new RuleTester()

const missingDecoratorError = (className: string) => ({
  messageId: 'missingDecorator' as const,
  data: { className },
})

describe('require-component-decorator', () => {
  it('is a valid ESLint rule', () => {
    expect(rule).toBeDefined()
  })

  ruleTester.run('require-component-decorator', rule, {
    valid: [
      {
        name: 'passes when class has @UseCase decorator',
        code: '@UseCase class CreateOrder {}',
      },
      {
        name: 'passes when class has @Event decorator',
        code: '@Event class OrderCreated {}',
      },
      {
        name: 'passes when class has @UI decorator',
        code: '@UI class OrderForm {}',
      },
      {
        name: 'passes when class has @DomainOpContainer decorator',
        code: '@DomainOpContainer class OrderOperations {}',
      },
      {
        name: 'passes when class has @APIContainer decorator',
        code: '@APIContainer class OrderController {}',
      },
      {
        name: 'passes when class has @EventHandlerContainer decorator',
        code: '@EventHandlerContainer class OrderEventHandlers {}',
      },
      {
        name: 'passes when class has @Custom call expression decorator',
        code: "@Custom('Aggregate') class Order {}",
      },
      {
        name: 'passes when class has @Ignore decorator',
        code: '@Ignore class TestFixture {}',
      },
      {
        name: 'ignores function declarations',
        code: 'function notAClass() {}',
      },
      {
        name: 'ignores interface declarations',
        code: 'interface NotAClass { name: string }',
      },
      {
        name: 'ignores type aliases',
        code: 'type NotAClass = string',
      },
      {
        name: 'ignores anonymous default export class',
        code: 'export default class {}',
      },
      {
        name: 'passes when class has multiple decorators including valid one',
        code: '@SomeOther @UseCase class MultiDecorated {}',
      },
      {
        name: 'passes when class has both valid and Ignore decorators',
        code: "@Custom('type') @Ignore class BothDecorated {}",
      },
    ],
    invalid: [
      {
        name: 'reports error when class has no decorators',
        code: 'class UndecoratedOrder {}',
        errors: [missingDecoratorError('UndecoratedOrder')],
      },
      {
        name: 'reports error when class has unrecognized decorator',
        code: '@SomeOtherDecorator class WrongDecorator {}',
        errors: [missingDecoratorError('WrongDecorator')],
      },
      {
        name: 'reports error when class has unrecognized call expression decorator',
        code: "@Unknown('type') class UnknownCallDecorator {}",
        errors: [missingDecoratorError('UnknownCallDecorator')],
      },
      {
        name: 'reports error when class has member expression decorator',
        code: '@decorators.UseCase class MemberExpressionDecorator {}',
        errors: [missingDecoratorError('MemberExpressionDecorator')],
      },
      {
        name: 'reports error for named default export class without decorator',
        code: 'export default class NamedClass {}',
        errors: [missingDecoratorError('NamedClass')],
      },
      {
        name: 'reports error when decorator has incorrect casing',
        code: '@usecase class WrongCasing {}',
        errors: [missingDecoratorError('WrongCasing')],
      },
    ],
  })
})
