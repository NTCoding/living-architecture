import {
  describe, it, expect 
} from 'vitest'
import {
  DomainOpContainer,
  APIContainer,
  EventHandlerContainer,
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
    it('applies to class without error', () => {
      @DomainOpContainer
      class OrderCreator {
        createOrder(): string {
          return 'created'
        }
      }

      expect(OrderCreator).toBeDefined()
      expect(new OrderCreator().createOrder).toBeDefined()
    })

    it('returns the original class', () => {
      class Original {
        value = 42
      }

      @DomainOpContainer
      class Decorated extends Original {}

      expect(new Decorated().value).toBe(42)
    })
  })

  describe('APIContainer', () => {
    it('applies to class without error', () => {
      @APIContainer
      class OrderController {
        getOrders(): string[] {
          return []
        }
      }

      expect(OrderController).toBeDefined()
      expect(new OrderController().getOrders).toBeDefined()
    })
  })

  describe('EventHandlerContainer', () => {
    it('applies to class without error', () => {
      @EventHandlerContainer
      class OrderEventListener {
        onOrderCreated(): boolean {
          return true
        }
      }

      expect(OrderEventListener).toBeDefined()
      expect(new OrderEventListener().onOrderCreated).toBeDefined()
    })
  })
})

describe('Class-as-component decorators', () => {
  describe('UseCase', () => {
    it('applies to class without error', () => {
      @UseCase
      class CreateOrderUseCase {
        execute(): string {
          return 'executed'
        }
      }

      expect(CreateOrderUseCase).toBeDefined()
      expect(new CreateOrderUseCase().execute).toBeDefined()
    })
  })

  describe('Event', () => {
    it('applies to class without error', () => {
      @Event
      class OrderCreated {
        readonly orderId: string = ''
      }

      expect(OrderCreated).toBeDefined()
      expect(new OrderCreated().orderId).toBe('')
    })
  })

  describe('UI', () => {
    it('applies to class without error', () => {
      @UI
      class OrderForm {
        render(): string {
          return '<form/>'
        }
      }

      expect(OrderForm).toBeDefined()
      expect(new OrderForm().render).toBeDefined()
    })
  })
})

describe('Method-level decorators', () => {
  describe('DomainOp', () => {
    it('applies to method without error', () => {
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
    it('applies to method without error', () => {
      class OrderController {
        @APIEndpoint
        getOrders(): string[] {
          return ['order1']
        }
      }

      expect(new OrderController().getOrders()).toEqual(['order1'])
    })
  })

  describe('EventHandler', () => {
    it('applies to method without error', () => {
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
    it('applies to class with custom type parameter', () => {
      @Custom('Aggregate')
      class Order {
        readonly id: string = 'order-1'
      }

      expect(Order).toBeDefined()
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

    it('applies to method with custom type parameter', () => {
      class OrderQuery {
        @Custom('Query')
        findAll(): string[] {
          return ['item1']
        }
      }

      expect(new OrderQuery().findAll()).toEqual(['item1'])
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
  })

  describe('Ignore', () => {
    it('applies to class without error', () => {
      @Ignore
      class InternalLogger {
        log(): string {
          return 'logged'
        }
      }

      expect(InternalLogger).toBeDefined()
      expect(new InternalLogger().log).toBeDefined()
    })

    it('applies to method without error', () => {
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
  it('allows container with method decorators', () => {
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
    expect(controller.getOrders()).toEqual([])
    expect(controller.healthCheck()).toBe(true)
  })

  it('allows class decorator with Custom method', () => {
    @UseCase
    class CreateOrderUseCase {
      @Custom('Command')
      execute(): string {
        return 'executed'
      }
    }

    expect(CreateOrderUseCase).toBeDefined()
  })
})
