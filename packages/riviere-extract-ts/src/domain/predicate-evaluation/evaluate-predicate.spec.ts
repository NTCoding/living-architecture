import {
  describe, it, expect 
} from 'vitest'
import { Project } from 'ts-morph'
import type { Predicate } from '@living-architecture/riviere-extract-config'
import { evaluatePredicate } from './evaluate-predicate'

function createTestProject(code: string) {
  const project = new Project({ useInMemoryFileSystem: true })
  return project.createSourceFile('test.ts', code)
}

describe('evaluatePredicate', () => {
  describe('hasDecorator', () => {
    it('returns true when class has matching decorator', () => {
      const sourceFile = createTestProject(`
        function API() { return (target: any) => target }
        @API
        class OrderController {}
      `)
      const classDecl = sourceFile.getClassOrThrow('OrderController')
      const predicate: Predicate = { hasDecorator: { name: 'API' } }

      const result = evaluatePredicate(classDecl, predicate)

      expect(result).toBe(true)
    })

    it('returns false when class has no decorator', () => {
      const sourceFile = createTestProject(`
        class OrderController {}
      `)
      const classDecl = sourceFile.getClassOrThrow('OrderController')
      const predicate: Predicate = { hasDecorator: { name: 'API' } }

      const result = evaluatePredicate(classDecl, predicate)

      expect(result).toBe(false)
    })

    it('returns false when class has different decorator', () => {
      const sourceFile = createTestProject(`
        function Service() { return (target: any) => target }
        @Service
        class OrderController {}
      `)
      const classDecl = sourceFile.getClassOrThrow('OrderController')
      const predicate: Predicate = { hasDecorator: { name: 'API' } }

      const result = evaluatePredicate(classDecl, predicate)

      expect(result).toBe(false)
    })

    it('returns true when decorator name matches any in array', () => {
      const sourceFile = createTestProject(`
        function Get() { return (target: any, key: string) => {} }
        class Controller {
          @Get
          findAll() {}
        }
      `)
      const classDecl = sourceFile.getClassOrThrow('Controller')
      const method = classDecl.getMethodOrThrow('findAll')
      const predicate: Predicate = { hasDecorator: { name: ['Get', 'Post', 'Put'] } }

      const result = evaluatePredicate(method, predicate)

      expect(result).toBe(true)
    })

    it('returns false when node is not decoratable', () => {
      const sourceFile = createTestProject(`
        function myFunction() {}
      `)
      const funcDecl = sourceFile.getFunctionOrThrow('myFunction')
      const predicate: Predicate = { hasDecorator: { name: 'API' } }

      const result = evaluatePredicate(funcDecl, predicate)

      expect(result).toBe(false)
    })

    describe('with from package', () => {
      it('returns true when decorator is imported from specified package', () => {
        const sourceFile = createTestProject(`
          import { Get } from '@nestjs/common'
          class Controller {
            @Get
            findAll() {}
          }
        `)
        const classDecl = sourceFile.getClassOrThrow('Controller')
        const method = classDecl.getMethodOrThrow('findAll')
        const predicate: Predicate = {
          hasDecorator: {
            name: 'Get',
            from: '@nestjs/common',
          },
        }

        const result = evaluatePredicate(method, predicate)

        expect(result).toBe(true)
      })

      it('returns false when decorator is from different package', () => {
        const sourceFile = createTestProject(`
          import { Get } from './local-decorators'
          class Controller {
            @Get
            findAll() {}
          }
        `)
        const classDecl = sourceFile.getClassOrThrow('Controller')
        const method = classDecl.getMethodOrThrow('findAll')
        const predicate: Predicate = {
          hasDecorator: {
            name: 'Get',
            from: '@nestjs/common',
          },
        }

        const result = evaluatePredicate(method, predicate)

        expect(result).toBe(false)
      })
    })
  })

  describe('hasJSDoc', () => {
    it('returns true when method has matching JSDoc tag', () => {
      const sf = createTestProject(`class S {
        /** @riviere */
        process() {}
      }`)
      expect(
        evaluatePredicate(sf.getClassOrThrow('S').getMethodOrThrow('process'), {hasJSDoc: { tag: 'riviere' },}),
      ).toBe(true)
    })

    it('returns false when method has no JSDoc', () => {
      const sf = createTestProject(`class S { process() {} }`)
      expect(
        evaluatePredicate(sf.getClassOrThrow('S').getMethodOrThrow('process'), {hasJSDoc: { tag: 'riviere' },}),
      ).toBe(false)
    })

    it('returns false when method has different JSDoc tag', () => {
      const sf = createTestProject(`class S {
        /** @deprecated */
        process() {}
      }`)
      expect(
        evaluatePredicate(sf.getClassOrThrow('S').getMethodOrThrow('process'), {hasJSDoc: { tag: 'riviere' },}),
      ).toBe(false)
    })

    it('returns true when function has matching JSDoc tag', () => {
      const sf = createTestProject(`/** @domainOp */
      function processOrder() {}`)
      expect(
        evaluatePredicate(sf.getFunctionOrThrow('processOrder'), { hasJSDoc: { tag: 'domainOp' } }),
      ).toBe(true)
    })

    it('returns false when node is not JSDocable', () => {
      const sf = createTestProject(`const x = 1;`)
      expect(
        evaluatePredicate(sf.getVariableDeclarationOrThrow('x'), { hasJSDoc: { tag: 'riviere' } }),
      ).toBe(false)
    })
  })

  describe('extendsClass', () => {
    it('returns true when class extends specified base class', () => {
      const sf = createTestProject(`class DomainEvent {} class OrderCreated extends DomainEvent {}`)
      expect(
        evaluatePredicate(sf.getClassOrThrow('OrderCreated'), {extendsClass: { name: 'DomainEvent' },}),
      ).toBe(true)
    })

    it('returns false when class extends different base class', () => {
      const sf = createTestProject(`class BaseEvent {} class OrderCreated extends BaseEvent {}`)
      expect(
        evaluatePredicate(sf.getClassOrThrow('OrderCreated'), {extendsClass: { name: 'DomainEvent' },}),
      ).toBe(false)
    })

    it('returns false when class has no extends clause', () => {
      const sf = createTestProject(`class OrderCreated {}`)
      expect(
        evaluatePredicate(sf.getClassOrThrow('OrderCreated'), {extendsClass: { name: 'DomainEvent' },}),
      ).toBe(false)
    })

    it('returns false when node is not a class', () => {
      const sf = createTestProject(`function fn() {}`)
      expect(
        evaluatePredicate(sf.getFunctionOrThrow('fn'), { extendsClass: { name: 'DomainEvent' } }),
      ).toBe(false)
    })
  })

  describe('implementsInterface', () => {
    it('returns true when class implements specified interface', () => {
      const sf = createTestProject(
        `interface IHandler {} class OrderHandler implements IHandler {}`,
      )
      expect(
        evaluatePredicate(sf.getClassOrThrow('OrderHandler'), {implementsInterface: { name: 'IHandler' },}),
      ).toBe(true)
    })

    it('returns false when class implements different interface', () => {
      const sf = createTestProject(
        `interface IService {} class OrderHandler implements IService {}`,
      )
      expect(
        evaluatePredicate(sf.getClassOrThrow('OrderHandler'), {implementsInterface: { name: 'IHandler' },}),
      ).toBe(false)
    })

    it('returns false when class has no implements clause', () => {
      const sf = createTestProject(`class OrderHandler {}`)
      expect(
        evaluatePredicate(sf.getClassOrThrow('OrderHandler'), {implementsInterface: { name: 'IHandler' },}),
      ).toBe(false)
    })

    it('returns false when node is not a class', () => {
      const sf = createTestProject(`function fn() {}`)
      expect(
        evaluatePredicate(sf.getFunctionOrThrow('fn'), {implementsInterface: { name: 'IHandler' },}),
      ).toBe(false)
    })
  })

  describe('nameEndsWith', () => {
    it('returns true when class name ends with suffix', () => {
      const sourceFile = createTestProject(`class OrderController {}`)
      const classDecl = sourceFile.getClassOrThrow('OrderController')
      expect(evaluatePredicate(classDecl, { nameEndsWith: { suffix: 'Controller' } })).toBe(true)
    })

    it('returns false when class name does not end with suffix', () => {
      const sourceFile = createTestProject(`class OrderService {}`)
      const classDecl = sourceFile.getClassOrThrow('OrderService')
      expect(evaluatePredicate(classDecl, { nameEndsWith: { suffix: 'Controller' } })).toBe(false)
    })

    it('returns false when node is not nameable', () => {
      const sourceFile = createTestProject(`const x = 1;`)
      const varDecl = sourceFile.getVariableDeclarationOrThrow('x')
      expect(evaluatePredicate(varDecl, { nameEndsWith: { suffix: 'Controller' } })).toBe(false)
    })
  })

  describe('nameMatches', () => {
    it('returns true when class name matches regex pattern', () => {
      const sourceFile = createTestProject(`class OrderAPI {}`)
      const classDecl = sourceFile.getClassOrThrow('OrderAPI')
      expect(evaluatePredicate(classDecl, { nameMatches: { pattern: '.*API$' } })).toBe(true)
    })

    it('returns false when class name does not match regex pattern', () => {
      const sourceFile = createTestProject(`class OrderService {}`)
      const classDecl = sourceFile.getClassOrThrow('OrderService')
      expect(evaluatePredicate(classDecl, { nameMatches: { pattern: '.*API$' } })).toBe(false)
    })

    it('returns false when node is not nameable', () => {
      const sourceFile = createTestProject(`const x = 1;`)
      const varDecl = sourceFile.getVariableDeclarationOrThrow('x')
      expect(evaluatePredicate(varDecl, { nameMatches: { pattern: '.*API$' } })).toBe(false)
    })
  })

  describe('inClassWith', () => {
    it('returns true when method is in class matching predicate', () => {
      const sourceFile = createTestProject(`
        function Controller() { return (target: any) => target }
        @Controller
        class OrderController {
          findAll() {}
        }
      `)
      const classDecl = sourceFile.getClassOrThrow('OrderController')
      const method = classDecl.getMethodOrThrow('findAll')
      const predicate: Predicate = { inClassWith: { hasDecorator: { name: 'Controller' } } }

      const result = evaluatePredicate(method, predicate)

      expect(result).toBe(true)
    })

    it('returns false when method is in class not matching predicate', () => {
      const sourceFile = createTestProject(`
        class OrderService {
          process() {}
        }
      `)
      const classDecl = sourceFile.getClassOrThrow('OrderService')
      const method = classDecl.getMethodOrThrow('process')
      const predicate: Predicate = { inClassWith: { hasDecorator: { name: 'Controller' } } }

      const result = evaluatePredicate(method, predicate)

      expect(result).toBe(false)
    })

    it('returns false when node is not a method', () => {
      const sourceFile = createTestProject(`
        class OrderService {}
      `)
      const classDecl = sourceFile.getClassOrThrow('OrderService')
      const predicate: Predicate = { inClassWith: { hasDecorator: { name: 'Controller' } } }

      const result = evaluatePredicate(classDecl, predicate)

      expect(result).toBe(false)
    })
  })

  describe('and', () => {
    it('returns true when all predicates match', () => {
      const sourceFile = createTestProject(`
        function API() { return (target: any) => target }
        @API
        class OrderController {}
      `)
      const classDecl = sourceFile.getClassOrThrow('OrderController')
      const predicate: Predicate = {and: [{ hasDecorator: { name: 'API' } }, { nameEndsWith: { suffix: 'Controller' } }],}

      const result = evaluatePredicate(classDecl, predicate)

      expect(result).toBe(true)
    })

    it('returns false when any predicate does not match', () => {
      const sourceFile = createTestProject(`
        function API() { return (target: any) => target }
        @API
        class OrderService {}
      `)
      const classDecl = sourceFile.getClassOrThrow('OrderService')
      const predicate: Predicate = {and: [{ hasDecorator: { name: 'API' } }, { nameEndsWith: { suffix: 'Controller' } }],}

      const result = evaluatePredicate(classDecl, predicate)

      expect(result).toBe(false)
    })
  })

  describe('or', () => {
    it('returns true when any predicate matches', () => {
      const sourceFile = createTestProject(`
        class OrderController {}
      `)
      const classDecl = sourceFile.getClassOrThrow('OrderController')
      const predicate: Predicate = {or: [{ hasDecorator: { name: 'API' } }, { nameEndsWith: { suffix: 'Controller' } }],}

      const result = evaluatePredicate(classDecl, predicate)

      expect(result).toBe(true)
    })

    it('returns false when no predicates match', () => {
      const sourceFile = createTestProject(`
        class OrderService {}
      `)
      const classDecl = sourceFile.getClassOrThrow('OrderService')
      const predicate: Predicate = {or: [{ hasDecorator: { name: 'API' } }, { nameEndsWith: { suffix: 'Controller' } }],}

      const result = evaluatePredicate(classDecl, predicate)

      expect(result).toBe(false)
    })
  })

  describe('nested predicates', () => {
    it('evaluates nested and/or predicates recursively', () => {
      const sourceFile = createTestProject(`
        function Get() { return (target: any, key: string) => {} }
        function Controller() { return (target: any) => target }
        @Controller
        class OrderController {
          @Get
          findAll() {}
        }
      `)
      const classDecl = sourceFile.getClassOrThrow('OrderController')
      const method = classDecl.getMethodOrThrow('findAll')
      const predicate: Predicate = {
        and: [
          { hasDecorator: { name: 'Get' } },
          { inClassWith: { hasDecorator: { name: 'Controller' } } },
        ],
      }

      const result = evaluatePredicate(method, predicate)

      expect(result).toBe(true)
    })
  })
})
