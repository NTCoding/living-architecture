import {
  afterAll, describe, expect, it 
} from 'vitest'
import { RuleTester } from '@typescript-eslint/rule-tester'
import rule from './event-publisher-method-signature.cjs'

RuleTester.afterAll = afterAll
RuleTester.it = it
RuleTester.describe = describe

const ruleTester = new RuleTester()

const typedRuleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      projectService: { allowDefaultProject: ['*.ts'] },
      tsconfigRootDir: import.meta.dirname,
    },
  },
})

const missingParameterError = (methodName: string, className: string) => ({
  messageId: 'missingParameter' as const,
  data: {
    methodName,
    className,
  },
})

const tooManyParametersError = (methodName: string, className: string) => ({
  messageId: 'tooManyParameters' as const,
  data: {
    methodName,
    className,
  },
})

const missingTypeAnnotationError = (methodName: string, className: string) => ({
  messageId: 'missingTypeAnnotation' as const,
  data: {
    methodName,
    className,
  },
})

const notTypeReferenceError = (methodName: string, className: string) => ({
  messageId: 'notTypeReference' as const,
  data: {
    methodName,
    className,
  },
})

const notEventDefError = (methodName: string, className: string, typeName: string) => ({
  messageId: 'notEventDef' as const,
  data: {
    methodName,
    className,
    typeName,
  },
})

const nonPublicMethodError = (methodName: string, className: string, accessibility: string) => ({
  messageId: 'nonPublicMethod' as const,
  data: {
    methodName,
    className,
    accessibility,
  },
})

describe('event-publisher-method-signature', () => {
  it('is a valid ESLint rule', () => {
    expect(rule).toBeDefined()
  })

  ruleTester.run('event-publisher-method-signature', rule, {
    valid: [
      // --- Core valid cases ---
      {
        name: 'passes when public method has one typed parameter',
        code: `
          class OrderPublisher implements EventPublisherDef {
            publishOrderPlaced(event: OrderPlacedEvent): void {}
          }
        `,
      },
      {
        name: 'passes with multiple methods each having one typed parameter',
        code: `
          class OrderPublisher implements EventPublisherDef {
            publishOrderPlaced(event: OrderPlacedEvent): void {}
            publishOrderCancelled(event: OrderCancelledEvent): void {}
          }
        `,
      },
      {
        name: 'passes with explicit public accessibility',
        code: `
          class OrderPublisher implements EventPublisherDef {
            public publishOrderPlaced(event: OrderPlacedEvent): void {}
          }
        `,
      },

      // --- Constructor exemption ---
      {
        name: 'passes when constructor has no parameters (constructors are exempt)',
        code: `
          class OrderPublisher implements EventPublisherDef {
            constructor() {}
            publishOrderPlaced(event: OrderPlacedEvent): void {}
          }
        `,
      },
      {
        name: 'passes when constructor has multiple parameters (constructors are exempt)',
        code: `
          class OrderPublisher implements EventPublisherDef {
            constructor(private bus: EventBus, private logger: Logger) {}
            publishOrderPlaced(event: OrderPlacedEvent): void {}
          }
        `,
      },
      {
        name: 'passes when class only has a constructor (no methods to check)',
        code: `
          class OrderPublisher implements EventPublisherDef {
            constructor(private bus: EventBus) {}
          }
        `,
      },

      // --- Getter/setter exemption ---
      {
        name: 'passes when class has getter (getters are not methods)',
        code: `
          class OrderPublisher implements EventPublisherDef {
            get eventCount(): number { return 0 }
            publishOrderPlaced(event: OrderPlacedEvent): void {}
          }
        `,
      },
      {
        name: 'passes when class has setter (setters are not methods)',
        code: `
          class OrderPublisher implements EventPublisherDef {
            set eventCount(value: number) {}
            publishOrderPlaced(event: OrderPlacedEvent): void {}
          }
        `,
      },

      // --- Non-EventPublisherDef classes (no false positives) ---
      {
        name: 'ignores classes not implementing EventPublisherDef',
        code: `
          class SomeService {
            doSomething(): void {}
          }
        `,
      },
      {
        name: 'ignores classes implementing a different interface',
        code: `
          class OrderHandler implements EventHandlerDef {
            readonly subscribedEvents = ['OrderPlaced']
            handle(): void {}
          }
        `,
      },
      {
        name: 'ignores classes implementing qualified non-EventPublisherDef interface',
        code: `
          class SomeClass implements Domain.OtherDef {
            doSomething(): void {}
          }
        `,
      },

      // --- Multiple interfaces ---
      {
        name: 'passes when class implements multiple interfaces including EventPublisherDef',
        code: `
          class OrderPublisher implements Serializable, EventPublisherDef {
            publishOrderPlaced(event: OrderPlacedEvent): void {}
          }
        `,
      },
    ],
    invalid: [
      // --- Missing parameter (zero parameters) ---
      {
        name: 'reports error when method has zero parameters',
        code: `
          class OrderPublisher implements EventPublisherDef {
            publishOrderPlaced(): void {}
          }
        `,
        errors: [missingParameterError('publishOrderPlaced', 'OrderPublisher')],
      },

      // --- Too many parameters ---
      {
        name: 'reports error when method has two parameters',
        code: `
          class OrderPublisher implements EventPublisherDef {
            publishOrderPlaced(event: OrderPlacedEvent, correlationId: string): void {}
          }
        `,
        errors: [tooManyParametersError('publishOrderPlaced', 'OrderPublisher')],
      },
      {
        name: 'reports error when method has three parameters',
        code: `
          class OrderPublisher implements EventPublisherDef {
            publishOrderPlaced(event: OrderPlacedEvent, correlationId: string, timestamp: Date): void {}
          }
        `,
        errors: [tooManyParametersError('publishOrderPlaced', 'OrderPublisher')],
      },

      // --- Missing type annotation ---
      {
        name: 'reports error when parameter has no type annotation',
        code: `
          class OrderPublisher implements EventPublisherDef {
            publishOrderPlaced(event): void {}
          }
        `,
        errors: [missingTypeAnnotationError('publishOrderPlaced', 'OrderPublisher')],
      },

      // --- Parameter type is not a type reference (primitive types) ---
      {
        name: 'reports error when parameter type is a primitive (string)',
        code: `
          class OrderPublisher implements EventPublisherDef {
            publishOrderPlaced(event: string): void {}
          }
        `,
        errors: [notTypeReferenceError('publishOrderPlaced', 'OrderPublisher')],
      },
      {
        name: 'reports error when parameter type is a primitive (number)',
        code: `
          class OrderPublisher implements EventPublisherDef {
            publishOrderPlaced(event: number): void {}
          }
        `,
        errors: [notTypeReferenceError('publishOrderPlaced', 'OrderPublisher')],
      },
      {
        name: 'reports error when parameter type is a union type',
        code: `
          class OrderPublisher implements EventPublisherDef {
            publishOrderPlaced(event: string | number): void {}
          }
        `,
        errors: [notTypeReferenceError('publishOrderPlaced', 'OrderPublisher')],
      },

      // --- Non-public methods ---
      {
        name: 'reports error for private method',
        code: `
          class OrderPublisher implements EventPublisherDef {
            private publishOrderPlaced(event: OrderPlacedEvent): void {}
          }
        `,
        errors: [nonPublicMethodError('publishOrderPlaced', 'OrderPublisher', 'private')],
      },
      {
        name: 'reports error for protected method',
        code: `
          class OrderPublisher implements EventPublisherDef {
            protected publishOrderPlaced(event: OrderPlacedEvent): void {}
          }
        `,
        errors: [nonPublicMethodError('publishOrderPlaced', 'OrderPublisher', 'protected')],
      },

      // --- Multiple errors in one class ---
      {
        name: 'reports multiple errors for multiple invalid methods',
        code: `
          class OrderPublisher implements EventPublisherDef {
            publishOrderPlaced(): void {}
            publishOrderCancelled(event: OrderCancelledEvent, extra: string): void {}
          }
        `,
        errors: [
          missingParameterError('publishOrderPlaced', 'OrderPublisher'),
          tooManyParametersError('publishOrderCancelled', 'OrderPublisher'),
        ],
      },

      // --- Non-public method with otherwise valid signature ---
      {
        name: 'reports error for private method even with valid parameter signature',
        code: `
          class OrderPublisher implements EventPublisherDef {
            private internalPublish(event: OrderPlacedEvent): void {}
          }
        `,
        errors: [nonPublicMethodError('internalPublish', 'OrderPublisher', 'private')],
      },

      // --- Multiple interfaces including EventPublisherDef with invalid method ---
      {
        name: 'reports error when implementing multiple interfaces including EventPublisherDef',
        code: `
          class OrderPublisher implements Serializable, EventPublisherDef {
            publishOrderPlaced(): void {}
          }
        `,
        errors: [missingParameterError('publishOrderPlaced', 'OrderPublisher')],
      },
    ],
  })

  // --- Typed linting tests (with type checker) ---
  const TYPE_AWARE_TIMEOUT = 30_000
  const originalIt = RuleTester.it
  const timedIt: typeof RuleTester.it = (name, fn) => it(name, fn, TYPE_AWARE_TIMEOUT)
  RuleTester.it = timedIt

  typedRuleTester.run('event-publisher-method-signature (typed)', rule, {
    valid: [
      {
        name: 'passes when parameter type implements EventDef (has readonly type: string)',
        code: `
          interface EventDef { readonly type: string }
          interface OrderPlacedEvent extends EventDef { readonly type: 'OrderPlaced' }
          interface EventPublisherDef {}
          class OrderPublisher implements EventPublisherDef {
            publishOrder(event: OrderPlacedEvent): void {}
          }
        `,
      },
      {
        name: 'passes when parameter type has type: string (non-readonly, structural compatibility)',
        code: `
          interface EventDef { readonly type: string }
          interface OrderPlacedEvent { type: string }
          interface EventPublisherDef {}
          class OrderPublisher implements EventPublisherDef {
            publishOrder(event: OrderPlacedEvent): void {}
          }
        `,
      },
      {
        name: 'passes when parameter type has string literal type property',
        code: `
          interface EventDef { readonly type: string }
          interface OrderPlacedEvent { readonly type: 'OrderPlaced' }
          interface EventPublisherDef {}
          class OrderPublisher implements EventPublisherDef {
            publishOrder(event: OrderPlacedEvent): void {}
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'reports error when parameter type does not have type property',
        code: `
          interface EventPublisherDef {}
          interface SomeRandomClass { name: string }
          class OrderPublisher implements EventPublisherDef {
            publishOrder(event: SomeRandomClass): void {}
          }
        `,
        errors: [notEventDefError('publishOrder', 'OrderPublisher', 'SomeRandomClass')],
      },
      {
        name: 'reports error when parameter type has type property but it is number not string',
        code: `
          interface EventPublisherDef {}
          interface BadEvent { type: number }
          class OrderPublisher implements EventPublisherDef {
            publishOrder(event: BadEvent): void {}
          }
        `,
        errors: [notEventDefError('publishOrder', 'OrderPublisher', 'BadEvent')],
      },
      {
        name: 'reports error when qualified type name does not implement EventDef',
        code: `
          interface EventPublisherDef {}
          declare namespace Domain { interface NotAnEvent { name: string } }
          class OrderPublisher implements EventPublisherDef {
            publishOrder(event: Domain.NotAnEvent): void {}
          }
        `,
        errors: [notEventDefError('publishOrder', 'OrderPublisher', 'NotAnEvent')],
      },
    ],
  })

  RuleTester.it = originalIt
})
