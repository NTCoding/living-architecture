import { describe, it, expect } from 'vitest'
import {
  DomainOpContainer,
  APIContainer,
  EventHandlerContainer,
  EventPublisherContainer,
  UseCase,
  Event,
  UI,
  DomainOp,
  APIEndpoint,
  EventHandler,
  HttpClient,
  HttpCall,
  Custom,
  Ignore,
  InvalidCustomComponentTypeError,
} from './decorators'

describe('Container decorators', () => {
  describe('DomainOpContainer', () => {
    it('preserves class method behavior when decorated', () => {
      @DomainOpContainer
      class Target {
        execute(): string {
          return 'result'
        }
      }
      expect(new Target().execute()).toBe('result')
    })

    it('preserves inherited properties when decorated', () => {
      class Original {
        value = 42
      }
      @DomainOpContainer
      class Decorated extends Original {}
      expect(new Decorated().value).toBe(42)
    })
  })

  describe('APIContainer', () => {
    it('preserves class method behavior when decorated', () => {
      @APIContainer
      class Target {
        execute(): string {
          return 'result'
        }
      }
      expect(new Target().execute()).toBe('result')
    })

    it('preserves inherited properties when decorated', () => {
      class Original {
        value = 42
      }
      @APIContainer
      class Decorated extends Original {}
      expect(new Decorated().value).toBe(42)
    })
  })

  describe('EventHandlerContainer', () => {
    it('preserves class method behavior when decorated', () => {
      @EventHandlerContainer
      class Target {
        execute(): string {
          return 'result'
        }
      }
      expect(new Target().execute()).toBe('result')
    })

    it('preserves inherited properties when decorated', () => {
      class Original {
        value = 42
      }
      @EventHandlerContainer
      class Decorated extends Original {}
      expect(new Decorated().value).toBe(42)
    })
  })

  describe('EventPublisherContainer', () => {
    it('preserves class method behavior when decorated', () => {
      @EventPublisherContainer
      class Target {
        execute(): string {
          return 'result'
        }
      }
      expect(new Target().execute()).toBe('result')
    })

    it('preserves inherited properties when decorated', () => {
      class Original {
        value = 42
      }
      @EventPublisherContainer
      class Decorated extends Original {}
      expect(new Decorated().value).toBe(42)
    })
  })
})

describe('Class-as-component decorators', () => {
  describe('UseCase', () => {
    it('preserves method return value when decorated', () => {
      @UseCase
      class CreateOrderUseCase {
        execute(): string {
          return 'executed'
        }
      }

      expect(new CreateOrderUseCase().execute()).toBe('executed')
    })
  })

  describe('Event', () => {
    it('preserves property value when decorated', () => {
      @Event
      class OrderCreated {
        readonly orderId: string = 'order-1'
      }

      expect(new OrderCreated().orderId).toBe('order-1')
    })
  })

  describe('UI', () => {
    it('preserves render output when decorated', () => {
      @UI
      class OrderForm {
        render(): string {
          return '<form/>'
        }
      }

      expect(new OrderForm().render()).toBe('<form/>')
    })
  })
})

describe('Method-level decorators', () => {
  describe('DomainOp', () => {
    it('preserves method return value when decorated', () => {
      class OrderCreator {
        @DomainOp
        createOrder(): string {
          return 'created'
        }
      }

      expect(new OrderCreator().createOrder()).toBe('created')
    })
  })

  describe('APIEndpoint', () => {
    it('preserves method return value when decorated', () => {
      class OrderController {
        @APIEndpoint
        getOrders(): string[] {
          return ['order1']
        }
      }

      expect(new OrderController().getOrders()).toStrictEqual(['order1'])
    })
  })

  describe('EventHandler', () => {
    it('preserves method return value when decorated', () => {
      class OrderEventListener {
        @EventHandler
        onOrderCreated(): boolean {
          return true
        }
      }

      expect(new OrderEventListener().onOrderCreated()).toBe(true)
    })
  })

  describe('HttpClient and HttpCall', () => {
    it('preserves method behavior when class and method are decorated', () => {
      @HttpClient('Fraud Detection Service')
      class FraudClient {
        @HttpCall('/api/check', 'POST')
        check(): string {
          return 'ok'
        }
      }

      expect(new FraudClient().check()).toBe('ok')
    })
  })
})

describe('Other decorators', () => {
  describe('Custom', () => {
    it('preserves instance property when applied to class', () => {
      @Custom('Aggregate')
      class Order {
        readonly id: string = 'order-1'
      }

      expect(new Order().id).toBe('order-1')
    })

    it('preserves method return value when applied to method', () => {
      class OrderQuery {
        @Custom('Query')
        findAll(): string[] {
          return ['item1']
        }
      }

      expect(new OrderQuery().findAll()).toStrictEqual(['item1'])
    })

    it('throws InvalidCustomComponentTypeError for empty string type', () => {
      expect(() => Custom('')).toThrow(InvalidCustomComponentTypeError)
      expect(() => Custom('')).toThrow("Custom component type must be a non-empty string, got: ''")
    })

    it('throws InvalidCustomComponentTypeError for whitespace-only type', () => {
      expect(() => Custom('   ')).toThrow(InvalidCustomComponentTypeError)
      expect(() => Custom('   ')).toThrow(
        "Custom component type must be a non-empty string, got: '   '",
      )
    })

    it.each([
      [null, 'null'],
      [42, '42'],
      [Symbol('component'), 'Symbol(component)'],
    ])('rejects non-string type %s with InvalidCustomComponentTypeError', (type, formattedType) => {
      expect(() => Custom(type)).toThrow(InvalidCustomComponentTypeError)
      expect(() => Custom(type)).toThrow(
        `Custom component type must be a non-empty string, got: ${formattedType}`,
      )
    })

    it('formats unprintable non-string types safely', () => {
      const unprintable = {
        toJSON: () => {
          throw null
        },
      }

      expect(() => Custom(unprintable)).toThrow(InvalidCustomComponentTypeError)
      expect(() => Custom(unprintable)).toThrow(
        'Custom component type must be a non-empty string, got: <unprintable value>',
      )
    })

    it('accepts type with forward slash', () => {
      expect(() => Custom('Order/Manager')).not.toThrow()
    })

    it('accepts type with hyphen', () => {
      expect(() => Custom('Order-Manager')).not.toThrow()
    })

    it('accepts type with dot', () => {
      expect(() => Custom('Order.Manager')).not.toThrow()
    })
  })

  describe('Ignore', () => {
    it('preserves method return value when applied to class', () => {
      @Ignore
      class InternalLogger {
        log(): string {
          return 'logged'
        }
      }

      expect(new InternalLogger().log()).toBe('logged')
    })

    it('preserves method return value when applied to method', () => {
      class OrderSubmitter {
        @Ignore
        internalHelper(): number {
          return 42
        }
      }

      expect(new OrderSubmitter().internalHelper()).toBe(42)
    })
  })
})

describe('Decorator combinations', () => {
  it('preserves all method behaviors with container and method decorators', () => {
    @APIContainer
    class OrderController {
      @APIEndpoint
      getOrders(): string[] {
        return []
      }

      @Ignore
      healthCheck(): boolean {
        return true
      }
    }

    const controller = new OrderController()
    expect(controller.getOrders()).toStrictEqual([])
    expect(controller.healthCheck()).toBe(true)
  })

  it('preserves method behavior with class and Custom method decorators', () => {
    @UseCase
    class CreateOrderUseCase {
      @Custom('Command')
      execute(): string {
        return 'executed'
      }
    }

    expect(new CreateOrderUseCase().execute()).toBe('executed')
  })
})
