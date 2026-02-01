import {
  describe, it, expect 
} from 'vitest'
import { Project } from 'ts-morph'
import { resolveInterface } from './resolve-interface'
import { ConnectionDetectionError } from '../connection-detection-error'

const sharedProject = new Project({ useInMemoryFileSystem: true })
const counter = { value: 0 }

function nextFile(basePath: string, content: string): string {
  counter.value++
  const filePath = basePath.replace('.ts', `-${counter.value}.ts`)
  sharedProject.createSourceFile(filePath, content)
  return filePath
}

describe('resolveInterface', () => {
  it('resolves to concrete type when interface has exactly one implementation', () => {
    const interfaceFile = nextFile(
      '/src/i.ts',
      `
      export interface PaymentGateway {
        charge(): void
      }
    `,
    )
    const implFile = nextFile(
      '/src/impl.ts',
      `
      import { PaymentGateway } from './i'
      export class StripeGateway implements PaymentGateway {
        charge(): void {}
      }
    `,
    )

    const result = resolveInterface('PaymentGateway', sharedProject, [interfaceFile, implFile], {strict: false,})

    expect(result).toStrictEqual({
      resolved: true,
      typeName: 'StripeGateway',
    })
  })

  it('resolves to concrete type when abstract class has exactly one extension', () => {
    const abstractFile = nextFile(
      '/src/base.ts',
      `
      export abstract class BaseRepository {
        abstract find(): void
      }
    `,
    )
    const implFile = nextFile(
      '/src/repo.ts',
      `
      import { BaseRepository } from './base'
      export class SqlRepository extends BaseRepository {
        find(): void {}
      }
    `,
    )

    const result = resolveInterface('BaseRepository', sharedProject, [abstractFile, implFile], {strict: false,})

    expect(result).toStrictEqual({
      resolved: true,
      typeName: 'SqlRepository',
    })
  })

  it('throws ConnectionDetectionError when zero implementations in strict mode', () => {
    const interfaceFile = nextFile(
      '/src/lonely.ts',
      `
      export interface LonelyInterface {
        doSomething(): void
      }
    `,
    )

    expect(() =>
      resolveInterface('LonelyInterface', sharedProject, [interfaceFile], { strict: true }),
    ).toThrow(ConnectionDetectionError)
  })

  it('returns unresolved with reason when zero implementations in lenient mode', () => {
    const interfaceFile = nextFile(
      '/src/lonely2.ts',
      `
      export interface UnusedInterface {
        doSomething(): void
      }
    `,
    )

    const result = resolveInterface('UnusedInterface', sharedProject, [interfaceFile], {strict: false,})

    expect(result).toStrictEqual({
      resolved: false,
      reason: expect.stringContaining('No implementation found for UnusedInterface'),
      typeDefinedInSource: true,
    })
  })

  it('throws ConnectionDetectionError listing count when multiple implementations in strict mode', () => {
    const interfaceFile = nextFile(
      '/src/multi.ts',
      `
      export interface Logger {
        log(msg: string): void
      }
    `,
    )
    const impl1 = nextFile(
      '/src/logger1.ts',
      `
      import { Logger } from './multi'
      export class ConsoleLogger implements Logger {
        log(msg: string): void {}
      }
    `,
    )
    const impl2 = nextFile(
      '/src/logger2.ts',
      `
      import { Logger } from './multi'
      export class FileLogger implements Logger {
        log(msg: string): void {}
      }
    `,
    )

    expect(() =>
      resolveInterface('Logger', sharedProject, [interfaceFile, impl1, impl2], { strict: true }),
    ).toThrow(ConnectionDetectionError)
  })

  it('returns unresolved with reason when multiple implementations in lenient mode', () => {
    const interfaceFile = nextFile(
      '/src/multi2.ts',
      `
      export interface Notifier {
        notify(): void
      }
    `,
    )
    const impl1 = nextFile(
      '/src/notifier1.ts',
      `
      import { Notifier } from './multi2'
      export class EmailNotifier implements Notifier {
        notify(): void {}
      }
    `,
    )
    const impl2 = nextFile(
      '/src/notifier2.ts',
      `
      import { Notifier } from './multi2'
      export class SmsNotifier implements Notifier {
        notify(): void {}
      }
    `,
    )

    const result = resolveInterface('Notifier', sharedProject, [interfaceFile, impl1, impl2], {strict: false,})

    expect(result).toStrictEqual({
      resolved: false,
      reason: expect.stringContaining('Multiple implementations found for Notifier'),
      typeDefinedInSource: true,
    })
  })

  it('resolves to single implementation when only one is within provided source files', () => {
    const interfaceFile = nextFile(
      '/src/scoped.ts',
      `
      export interface Cache {
        get(key: string): string
      }
    `,
    )
    const inScopeImpl = nextFile(
      '/src/redis-cache.ts',
      `
      import { Cache } from './scoped'
      export class RedisCache implements Cache {
        get(key: string): string { return '' }
      }
    `,
    )
    nextFile(
      '/src/memory-cache.ts',
      `
      import { Cache } from './scoped'
      export class MemoryCache implements Cache {
        get(key: string): string { return '' }
      }
    `,
    )

    const result = resolveInterface('Cache', sharedProject, [interfaceFile, inScopeImpl], {strict: false,})

    expect(result).toStrictEqual({
      resolved: true,
      typeName: 'RedisCache',
    })
  })

  it('excludes node_modules file paths from search', () => {
    const interfaceFile = nextFile(
      '/src/service.ts',
      `
      export interface Service {
        execute(): void
      }
    `,
    )
    const nodeModulesFile = nextFile(
      '/node_modules/lib/service-impl.ts',
      `
      import { Service } from '../../src/service'
      export class LibService implements Service {
        execute(): void {}
      }
    `,
    )

    const result = resolveInterface('Service', sharedProject, [interfaceFile, nodeModulesFile], {strict: false,})

    expect(result).toStrictEqual({
      resolved: false,
      reason: expect.stringContaining('No implementation found for Service'),
      typeDefinedInSource: true,
    })
  })
})
