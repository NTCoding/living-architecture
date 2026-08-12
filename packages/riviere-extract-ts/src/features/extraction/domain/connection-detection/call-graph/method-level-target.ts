import type { ClassDeclaration, MethodDeclaration } from 'ts-morph'

/** @riviere-role value-object */
export class MethodLevelTarget {
  declare private brand: 'MethodLevelTarget'
  readonly classDecl: ClassDeclaration
  readonly method: MethodDeclaration

  static parse(params: {
    classDecl: ClassDeclaration
    method: MethodDeclaration
  }): MethodLevelTarget {
    return new MethodLevelTarget(params)
  }

  private constructor(params: {
    classDecl: ClassDeclaration;
    method: MethodDeclaration 
  }) {
    this.classDecl = params.classDecl
    this.method = params.method
  }
}
