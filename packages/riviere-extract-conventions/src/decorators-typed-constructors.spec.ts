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
  Custom,
  Ignore,
  getCustomType,
} from './decorators'

describe('All decorators with typed constructor parameters', () => {
  describe('DomainOpContainer with typed constructor', () => {
    it('preserves method behavior with injected dependency', () => {
      interface Repo {find(): string}
      @DomainOpContainer
      class Handler {
        constructor(private repo: Repo) {}
        handle(): string {
          return this.repo.find()
        }
      }
      const handler = new Handler({ find: () => 'found' })
      expect(handler.handle()).toBe('found')
    })
  })

  describe('APIContainer with typed constructor', () => {
    it('preserves method behavior with injected dependency', () => {
      interface Service {process(): string}
      @APIContainer
      class Endpoint {
        constructor(private service: Service) {}
        get(): string {
          return this.service.process()
        }
      }
      const endpoint = new Endpoint({ process: () => 'processed' })
      expect(endpoint.get()).toBe('processed')
    })
  })

  describe('EventHandlerContainer with typed constructor', () => {
    it('preserves method behavior with injected dependency', () => {
      interface Store {save(data: object): string}
      @EventHandlerContainer
      class Listener {
        constructor(private store: Store) {}
        onEvent(): string {
          return this.store.save({})
        }
      }
      const listener = new Listener({ save: () => 'saved' })
      expect(listener.onEvent()).toBe('saved')
    })
  })

  describe('EventPublisherContainer with typed constructor', () => {
    it('preserves method behavior with injected dependency', () => {
      interface EventBus {publish(event: object): string}
      @EventPublisherContainer
      class Publisher {
        constructor(private bus: EventBus) {}
        publishOrder(): string {
          return this.bus.publish({})
        }
      }
      const publisher = new Publisher({ publish: () => 'published' })
      expect(publisher.publishOrder()).toBe('published')
    })
  })

  describe('UseCase with typed constructor', () => {
    it('preserves method behavior with injected dependency', () => {
      interface Repo {create(data: object): string}
      @UseCase
      class CreateUseCase {
        constructor(private repo: Repo) {}
        execute(): string {
          return this.repo.create({})
        }
      }
      const uc = new CreateUseCase({ create: () => 'created' })
      expect(uc.execute()).toBe('created')
    })

    it('exposes parameter properties on instance', () => {
      @UseCase
      class CreateUseCase {
        constructor(public readonly id: string) {}
        execute(): string {
          return this.id
        }
      }
      const uc = new CreateUseCase('123')
      expect(uc.id).toBe('123')
    })
  })

  describe('Event with typed constructor', () => {
    it('exposes parameter properties on instance', () => {
      @Event
      class OrderCreated {
        constructor(public readonly orderId: string) {}
      }
      const evt = new OrderCreated('order-1')
      expect(evt.orderId).toBe('order-1')
    })

    it('exposes multiple parameter properties on instance', () => {
      @Event
      class OrderCreated {
        constructor(
          public readonly orderId: string,
          public readonly timestamp: Date,
        ) {}
      }
      const now = new Date()
      const evt = new OrderCreated('order-1', now)
      expect(evt.orderId).toBe('order-1')
      expect(evt.timestamp).toBe(now)
    })
  })

  describe('UI with typed constructor', () => {
    it('preserves render output with injected dependency', () => {
      interface Theme {primary: string}
      @UI
      class Form {
        constructor(private theme: Theme) {}
        render(): string {
          return `<form color="${this.theme.primary}"></form>`
        }
      }
      const form = new Form({ primary: 'blue' })
      expect(form.render()).toBe('<form color="blue"></form>')
    })
  })

  describe('Custom with typed constructor', () => {
    it('stores custom type and preserves method behavior', () => {
      interface Config {timeout: number}
      @Custom('MyComponent')
      class MyClass {
        constructor(private config: Config) {}
        getTimeout(): number {
          return this.config.timeout
        }
      }
      const instance = new MyClass({ timeout: 5000 })
      expect(instance.getTimeout()).toBe(5000)
      expect(getCustomType(MyClass)).toBe('MyComponent')
    })

    it('stores custom type on method in class with typed constructor', () => {
      interface Service {process(): string}
      class MyClass {
        constructor(private service: Service) {}
        @Custom('Query')
        find(): string {
          return this.service.process()
        }
      }
      const instance = new MyClass({ process: () => 'result' })
      expect(getCustomType(instance.find)).toBe('Query')
    })
  })

  describe('Ignore with typed constructor', () => {
    it('preserves method behavior when applied to class', () => {
      interface Logger {log(msg: string): string}
      @Ignore
      class AuditLogger {
        constructor(private logger: Logger) {}
        help(): string {
          return this.logger.log('helping')
        }
      }
      const audit = new AuditLogger({ log: (msg: string) => msg })
      expect(audit.help()).toBe('helping')
    })

    it('preserves method behavior when applied to method', () => {
      interface Repo {find(): string}
      class MyClass {
        constructor(private repo: Repo) {}
        @Ignore
        internalMethod(): string {
          return this.repo.find()
        }
      }
      const instance = new MyClass({ find: () => 'data' })
      expect(instance.internalMethod()).toBe('data')
    })
  })

  describe('getCustomType edge cases', () => {
    it('returns undefined for null', () => {
      expect(getCustomType(null)).toBeUndefined()
    })

    it('returns undefined for undefined', () => {
      expect(getCustomType(undefined)).toBeUndefined()
    })

    it('returns undefined for primitives', () => {
      expect(getCustomType(42)).toBeUndefined()
      expect(getCustomType('string')).toBeUndefined()
      expect(getCustomType(true)).toBeUndefined()
    })

    it('returns undefined when no custom type is set', () => {
      class NoType {}
      expect(getCustomType(NoType)).toBeUndefined()
    })
  })
})
