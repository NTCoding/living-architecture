import {
  describe, it, expect 
} from 'vitest'
import {
  Project, SyntaxKind 
} from 'ts-morph'
import { evaluateFromClassDecoratorArgRule } from './evaluate-extraction-rule'
import {
  ExtractionError,
  TestFixtureError,
} from '../../../../platform/domain/ast-literals/literal-detection'

function createMethodFromClass(code: string) {
  const project = new Project({ useInMemoryFileSystem: true })
  const sf = project.createSourceFile('test-class.ts', code)
  const classDecl = sf.getClasses()[0]
  if (!classDecl) {
    throw new TestFixtureError('No class found in test code')
  }

  const method = classDecl.getMethods()[0]
  if (!method) {
    throw new TestFixtureError('No method found in class')
  }

  return method
}

function createMethodFromObjectLiteral(code: string) {
  const project = new Project({ useInMemoryFileSystem: true })
  const sf = project.createSourceFile('test-object-literal.ts', code)
  const method = sf.getDescendantsOfKind(SyntaxKind.MethodDeclaration)[0]

  if (!method) {
    throw new TestFixtureError('No method declaration found in object literal')
  }

  return method
}

describe('evaluateFromClassDecoratorArgRule coverage', () => {
  it('throws ExtractionError when method is not declared in a class', () => {
    const method = createMethodFromObjectLiteral(
      `const obj = {
  check() {}
}`,
    )

    expect(() =>
      evaluateFromClassDecoratorArgRule(
        {
          fromClassDecoratorArg: {
            decorator: 'HttpClient',
            position: 0,
          },
        },
        method,
      ),
    ).toThrow(ExtractionError)
  })

  it('throws ExtractionError when containing class does not have expected decorator', () => {
    const method = createMethodFromClass(
      `function HttpClient(_: string) { return () => {} }
class FraudClient {
  check() {}
}`,
    )

    expect(() =>
      evaluateFromClassDecoratorArgRule(
        {
          fromClassDecoratorArg: {
            decorator: 'HttpClient',
            position: 0,
          },
        },
        method,
      ),
    ).toThrow(ExtractionError)
  })

  it('throws ExtractionError with anonymous class context when decorator is missing', () => {
    const method = createMethodFromClass(
      `export default class {
  check() {}
}`,
    )

    expect(() =>
      evaluateFromClassDecoratorArgRule(
        {
          fromClassDecoratorArg: {
            decorator: 'HttpClient',
            position: 0,
          },
        },
        method,
      ),
    ).toThrow(ExtractionError)
  })

  it('extracts named class decorator arg and applies transform', () => {
    const method = createMethodFromClass(
      `function HttpClient(config: { name: string }) { return () => {} }
@HttpClient({ name: 'Fraud Detection Service' })
class FraudClient {
  check() {}
}`,
    )

    const result = evaluateFromClassDecoratorArgRule(
      {
        fromClassDecoratorArg: {
          decorator: 'HttpClient',
          name: 'name',
          transform: { toUpperCase: true },
        },
      },
      method,
    )

    expect(result.value).toBe('FRAUD DETECTION SERVICE')
  })
})
