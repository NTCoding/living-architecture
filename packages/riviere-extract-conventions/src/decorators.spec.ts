import {
  describe, it, expect 
} from 'vitest'
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
  Custom,
  Ignore,
  getCustomType,
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

    it('stores custom type for extraction', () => {
      @Custom('Repository')
      class OrderRepository {
        findAll(): string[] {
          return []
        }
      }

      expect(getCustomType(OrderRepository)).toBe('Repository')
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

    it('returns undefined for undecorated class', () => {
      class UndecoratedOrder {
        readonly id: string = 'order-1'
      }

      expect(getCustomType(UndecoratedOrder)).toBeUndefined()
    })

    it('stores custom type for method extraction', () => {
      class OrderQueries {
        @Custom('Query')
        findById(): string {
          return 'order-1'
        }
      }

      const instance = new OrderQueries()
      expect(getCustomType(instance.findById)).toBe('Query')
    })

    it('throws TypeError for empty string type', () => {
      expect(() => Custom('')).toThrow(TypeError)
      expect(() => Custom('')).toThrow('Custom component type cannot be empty or whitespace-only')
    })

    it('throws TypeError for whitespace-only type', () => {
      expect(() => Custom('   ')).toThrow(TypeError)
      expect(() => Custom('   ')).toThrow(
        'Custom component type cannot be empty or whitespace-only',
      )
    })

    it('trims whitespace from type parameter', () => {
      @Custom('  Aggregate  ')
      class TrimmedOrder {
        readonly id: string = 'order-1'
      }

      expect(getCustomType(TrimmedOrder)).toBe('Aggregate')
    })

    it('accepts type with forward slash', () => {
      @Custom('Order/Manager')
      class SlashType {
        readonly id: string = '1'
      }

      expect(getCustomType(SlashType)).toBe('Order/Manager')
    })

    it('accepts type with hyphen', () => {
      @Custom('Order-Manager')
      class HyphenType {
        readonly id: string = '1'
      }

      expect(getCustomType(HyphenType)).toBe('Order-Manager')
    })

    it('accepts type with dot', () => {
      @Custom('Order.Manager')
      class DotType {
        readonly id: string = '1'
      }

      expect(getCustomType(DotType)).toBe('Order.Manager')
    })

    it('last decorator wins when multiple Custom decorators applied to class', () => {
      @Custom('First')
      @Custom('Second')
      class MultiCustom {
        readonly id: string = '1'
      }

      expect(getCustomType(MultiCustom)).toBe('First')
    })

    it('last decorator wins when multiple Custom decorators applied to method', () => {
      class MultiMethod {
        @Custom('First')
        @Custom('Second')
        multiMethod(): string {
          return 'multi'
        }
      }

      const instance = new MultiMethod()
      expect(getCustomType(instance.multiMethod)).toBe('First')
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
