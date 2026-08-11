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

const invalidEventTypeError = (methodName: string, className: string, typeName: string) => ({
  messageId: 'invalidEventType' as const,
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
        name: 'passes when @EventPublisherContainer class public method has one typed parameter',
        code: `
          @EventPublisherContainer
          class OrderPublisher {
            publishOrderPlaced(event: OrderPlacedEvent): void {}
          }
        `,
      },
      {
        name: 'passes with multiple methods each having one typed parameter',
        code: `
          @EventPublisherContainer
          class OrderPublisher {
            publishOrderPlaced(event: OrderPlacedEvent): void {}
            publishOrderCancelled(event: OrderCancelledEvent): void {}
          }
        `,
      },
      {
        name: 'passes with explicit public accessibility',
        code: `
          @EventPublisherContainer
          class OrderPublisher {
            public publishOrderPlaced(event: OrderPlacedEvent): void {}
          }
        `,
      },

      // --- Constructor exemption ---
      {
        name: 'passes when constructor has no parameters (constructors are exempt)',
        code: `
          @EventPublisherContainer
          class OrderPublisher {
            constructor() {}
            publishOrderPlaced(event: OrderPlacedEvent): void {}
          }
        `,
      },
      {
        name: 'passes when constructor has multiple parameters (constructors are exempt)',
        code: `
          @EventPublisherContainer
          class OrderPublisher {
            constructor(private bus: EventBus, private logger: Logger) {}
            publishOrderPlaced(event: OrderPlacedEvent): void {}
          }
        `,
      },
      {
        name: 'passes when class only has a constructor (no methods to check)',
        code: `
          @EventPublisherContainer
          class OrderPublisher {
            constructor(private bus: EventBus) {}
          }
        `,
      },

      // --- Getter/setter exemption ---
      {
        name: 'passes when class has getter (getters are not methods)',
        code: `
          @EventPublisherContainer
          class OrderPublisher {
            get eventCount(): number { return 0 }
            publishOrderPlaced(event: OrderPlacedEvent): void {}
          }
        `,
      },
      {
        name: 'passes when class has setter (setters are not methods)',
        code: `
          @EventPublisherContainer
          class OrderPublisher {
            set eventCount(value: number) {}
            publishOrderPlaced(event: OrderPlacedEvent): void {}
          }
        `,
      },

      // --- Non-EventPublisherContainer classes (no false positives) ---
      {
        name: 'ignores classes without @EventPublisherContainer decorator',
        code: `
          class SomeService {
            doSomething(): void {}
          }
        `,
      },
      {
        name: 'ignores classes with a different decorator',
        code: `
          @EventHandlerContainer
          class OrderHandler {
            handle(): void {}
          }
        `,
      },
    ],
    invalid: [
      // --- Missing parameter (zero parameters) ---
      {
        name: 'reports error when method has zero parameters',
        code: `
          @EventPublisherContainer
          class OrderPublisher {
            publishOrderPlaced(): void {}
          }
        `,
        errors: [missingParameterError('publishOrderPlaced', 'OrderPublisher')],
      },

      // --- Too many parameters ---
      {
        name: 'reports error when method has two parameters',
        code: `
          @EventPublisherContainer
          class OrderPublisher {
            publishOrderPlaced(event: OrderPlacedEvent, correlationId: string): void {}
          }
        `,
        errors: [tooManyParametersError('publishOrderPlaced', 'OrderPublisher')],
      },
      {
        name: 'reports error when method has three parameters',
        code: `
          @EventPublisherContainer
          class OrderPublisher {
            publishOrderPlaced(event: OrderPlacedEvent, correlationId: string, timestamp: Date): void {}
          }
        `,
        errors: [tooManyParametersError('publishOrderPlaced', 'OrderPublisher')],
      },

      // --- Missing type annotation ---
      {
        name: 'reports error when parameter has no type annotation',
        code: `
          @EventPublisherContainer
          class OrderPublisher {
            publishOrderPlaced(event): void {}
          }
        `,
        errors: [missingTypeAnnotationError('publishOrderPlaced', 'OrderPublisher')],
      },

      // --- Parameter type is not a type reference (primitive types) ---
      {
        name: 'reports error when parameter type is a primitive (string)',
        code: `
          @EventPublisherContainer
          class OrderPublisher {
            publishOrderPlaced(event: string): void {}
          }
        `,
        errors: [notTypeReferenceError('publishOrderPlaced', 'OrderPublisher')],
      },
      {
        name: 'reports error when parameter type is a primitive (number)',
        code: `
          @EventPublisherContainer
          class OrderPublisher {
            publishOrderPlaced(event: number): void {}
          }
        `,
        errors: [notTypeReferenceError('publishOrderPlaced', 'OrderPublisher')],
      },
      {
        name: 'reports error when parameter type is a union type',
        code: `
          @EventPublisherContainer
          class OrderPublisher {
            publishOrderPlaced(event: string | number): void {}
          }
        `,
        errors: [notTypeReferenceError('publishOrderPlaced', 'OrderPublisher')],
      },

      // --- Non-public methods ---
      {
        name: 'reports error for private method',
        code: `
          @EventPublisherContainer
          class OrderPublisher {
            private publishOrderPlaced(event: OrderPlacedEvent): void {}
          }
        `,
        errors: [nonPublicMethodError('publishOrderPlaced', 'OrderPublisher', 'private')],
      },
      {
        name: 'reports error for protected method',
        code: `
          @EventPublisherContainer
          class OrderPublisher {
            protected publishOrderPlaced(event: OrderPlacedEvent): void {}
          }
        `,
        errors: [nonPublicMethodError('publishOrderPlaced', 'OrderPublisher', 'protected')],
      },

      // --- Multiple errors in one class ---
      {
        name: 'reports multiple errors for multiple invalid methods',
        code: `
          @EventPublisherContainer
          class OrderPublisher {
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
          @EventPublisherContainer
          class OrderPublisher {
            private internalPublish(event: OrderPlacedEvent): void {}
          }
        `,
        errors: [nonPublicMethodError('internalPublish', 'OrderPublisher', 'private')],
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
        name: 'passes when parameter type has readonly type: string',
        code: `
          interface OrderPlacedEvent { readonly type: 'OrderPlaced' }
          @EventPublisherContainer
          class OrderPublisher {
            publishOrder(event: OrderPlacedEvent): void {}
          }
        `,
      },
      {
        name: 'passes when parameter type has type: string (non-readonly, structural compatibility)',
        code: `
          interface OrderPlacedEvent { type: string }
          @EventPublisherContainer
          class OrderPublisher {
            publishOrder(event: OrderPlacedEvent): void {}
          }
        `,
      },
      {
        name: 'passes when parameter type has string literal type property',
        code: `
          interface OrderPlacedEvent { readonly type: 'OrderPlaced' }
          @EventPublisherContainer
          class OrderPublisher {
            publishOrder(event: OrderPlacedEvent): void {}
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'reports error when parameter type does not have type property',
        code: `
          interface SomeRandomClass { name: string }
          @EventPublisherContainer
          class OrderPublisher {
            publishOrder(event: SomeRandomClass): void {}
          }
        `,
        errors: [invalidEventTypeError('publishOrder', 'OrderPublisher', 'SomeRandomClass')],
      },
      {
        name: 'reports error when parameter type has type property but it is number not string',
        code: `
          interface BadEvent { type: number }
          @EventPublisherContainer
          class OrderPublisher {
            publishOrder(event: BadEvent): void {}
          }
        `,
        errors: [invalidEventTypeError('publishOrder', 'OrderPublisher', 'BadEvent')],
      },
      {
        name: 'reports error when qualified type name does not have type: string property',
        code: `
          declare namespace Domain { interface NotAnEvent { name: string } }
          @EventPublisherContainer
          class OrderPublisher {
            publishOrder(event: Domain.NotAnEvent): void {}
          }
        `,
        errors: [invalidEventTypeError('publishOrder', 'OrderPublisher', 'NotAnEvent')],
      },
    ],
  })

  RuleTester.it = originalIt
})
