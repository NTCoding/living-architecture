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
  Custom,
  Ignore,
  getCustomType,
} from './decorators'

describe('All decorators with typed constructor parameters', () => {
  describe('DomainOpContainer with typed constructor', () => {
    it('works with single typed parameter', () => {
      interface Repo {find(): string}
      @DomainOpContainer
      class Handler {
        constructor(private repo: Repo) {}
        handle(): string {
          return this.repo.find()
        }
      }
      expect(Handler).toBeDefined()
    })
  })

  describe('APIContainer with typed constructor', () => {
    it('works with single typed parameter', () => {
      interface Service {process(): string}
      @APIContainer
      class Endpoint {
        constructor(private service: Service) {}
        get(): string {
          return this.service.process()
        }
      }
      expect(Endpoint).toBeDefined()
    })
  })

  describe('EventHandlerContainer with typed constructor', () => {
    it('works with single typed parameter', () => {
      interface Store {save(data: object): void}
      @EventHandlerContainer
      class Listener {
        constructor(private store: Store) {}
        onEvent(): void {
          this.store.save({})
        }
      }
      expect(Listener).toBeDefined()
    })
  })

  describe('UseCase with typed constructor', () => {
    it('works with single typed parameter', () => {
      interface Repo {create(data: object): void}
      @UseCase
      class CreateUseCase {
        constructor(private repo: Repo) {}
        execute(): void {
          this.repo.create({})
        }
      }
      expect(CreateUseCase).toBeDefined()
    })

    it('works with parameter properties', () => {
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
    it('works with parameter properties', () => {
      @Event
      class OrderCreated {
        constructor(public readonly orderId: string) {}
      }
      const evt = new OrderCreated('order-1')
      expect(evt.orderId).toBe('order-1')
    })

    it('works with multiple typed parameters', () => {
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
    it('works with single typed parameter', () => {
      interface Theme {primary: string}
      @UI
      class Form {
        constructor(private theme: Theme) {}
        render(): string {
          return `<form color="${this.theme.primary}"></form>`
        }
      }
      expect(Form).toBeDefined()
    })
  })

  describe('Custom with typed constructor', () => {
    it('works on class with typed parameter', () => {
      interface Config {timeout: number}
      @Custom('MyComponent')
      class MyClass {
        constructor(private config: Config) {}
        getTimeout(): number {
          return this.config.timeout
        }
      }
      expect(MyClass).toBeDefined()
      expect(getCustomType(MyClass)).toBe('MyComponent')
    })

    it('works on method with typed constructor class', () => {
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
    it('works on class with typed parameter', () => {
      interface Logger {log(msg: string): void}
      @Ignore
      class AuditLogger {
        constructor(private logger: Logger) {}
        help(): void {
          this.logger.log('helping')
        }
      }
      expect(AuditLogger).toBeDefined()
    })

    it('works on method in class with typed constructor', () => {
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
