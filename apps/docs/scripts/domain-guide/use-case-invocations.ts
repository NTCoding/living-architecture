import ts from 'typescript'
import type {
  AnnotatedDeclaration,
  DomainConcept,
  InvocationGuideEntry,
  ParsedSource,
} from './domain-guide-source'
import {
  annotatedDeclarations,
  classTypePaths,
  conceptInType,
  expressionPath,
  importedDomainConcepts,
  parameterTypePaths,
  visit,
} from './typescript-invocation-support'

export function aggregateRepositoryReturns(
  sources: readonly ParsedSource[],
  domainModelPackageName: string,
  domainConcepts: ReadonlyMap<string, DomainConcept>,
): ReadonlyMap<string, ReadonlyMap<string, string>> {
  const repositories = new Map<string, ReadonlyMap<string, string>>()
  for (const entry of annotatedDeclarations(sources)) {
    if (entry.role !== 'aggregate-repository' || !ts.isClassDeclaration(entry.declaration)) {
      continue
    }
    const importedConcepts = importedDomainConcepts(
      entry.sourceFile,
      domainModelPackageName,
      domainConcepts,
    )
    const methods = new Map<string, string>()
    for (const member of entry.declaration.members) {
      if (!ts.isMethodDeclaration(member) || member.type === undefined) {
        continue
      }
      const aggregate = conceptInType(member.type, importedConcepts, 'aggregate')
      if (aggregate !== undefined) {
        methods.set(member.name.getText(entry.sourceFile), aggregate.name)
      }
    }
    repositories.set(entry.name, methods)
  }
  return repositories
}

export function inspectInvocations(
  useCase: AnnotatedDeclaration,
  domainModelPackageName: string | undefined,
  domainConcepts: ReadonlyMap<string, DomainConcept>,
  repositoryReturns: ReadonlyMap<string, ReadonlyMap<string, string>>,
): readonly InvocationGuideEntry[] {
  const importedConcepts =
    domainModelPackageName === undefined
      ? new Map<string, DomainConcept>()
      : importedDomainConcepts(useCase.sourceFile, domainModelPackageName, domainConcepts)
  const typePaths = classTypePaths(useCase.declaration, useCase.sourceFile)
  const helperReturns = localHelperReturns(useCase.sourceFile, repositoryReturns, importedConcepts)
  const aggregateVariables = aggregateVariableTypes(
    useCase.declaration,
    typePaths,
    repositoryReturns,
    helperReturns,
    importedConcepts,
  )
  const invocations: InvocationGuideEntry[] = []
  const seen = new Set<string>()
  collectInvocations(
    useCase.declaration,
    typePaths,
    aggregateVariables,
    importedConcepts,
    seen,
    invocations,
  )
  for (const helper of directlyCalledHelpers(useCase.declaration, useCase.sourceFile)) {
    const helperTypePaths = parameterTypePaths(helper.parameters, useCase.sourceFile)
    const helperAggregateVariables = aggregateVariableTypes(
      helper,
      helperTypePaths,
      repositoryReturns,
      helperReturns,
      importedConcepts,
    )
    collectInvocations(
      helper,
      helperTypePaths,
      helperAggregateVariables,
      importedConcepts,
      seen,
      invocations,
    )
  }
  return invocations
}

function collectInvocations(
  declaration: ts.Node,
  typePaths: ReadonlyMap<string, string>,
  aggregateVariables: ReadonlyMap<string, string>,
  importedConcepts: ReadonlyMap<string, DomainConcept>,
  seen: Set<string>,
  invocations: InvocationGuideEntry[],
): void {
  visit(declaration, (node) => {
    if (!ts.isCallExpression(node)) {
      return
    }
    const invocation = invocationFromCall(node, typePaths, aggregateVariables, importedConcepts)
    if (invocation === undefined) {
      return
    }
    const key = `${invocation.role}:${invocation.concept}:${invocation.operation}`
    if (!seen.has(key)) {
      seen.add(key)
      invocations.push(invocation)
    }
  })
}

function directlyCalledHelpers(
  declaration: AnnotatedDeclaration['declaration'],
  sourceFile: ts.SourceFile,
): readonly ts.FunctionDeclaration[] {
  const calledFunctions = new Set<string>()
  visit(declaration, (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      calledFunctions.add(node.expression.text)
    }
  })
  return sourceFile.statements.filter(
    (statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) &&
      statement.name !== undefined &&
      calledFunctions.has(statement.name.text),
  )
}

function invocationFromCall(
  call: ts.CallExpression,
  typePaths: ReadonlyMap<string, string>,
  aggregateVariables: ReadonlyMap<string, string>,
  importedConcepts: ReadonlyMap<string, DomainConcept>,
): InvocationGuideEntry | undefined {
  if (ts.isIdentifier(call.expression)) {
    return domainServiceFunctionInvocation(call.expression, importedConcepts)
  }
  if (!ts.isPropertyAccessExpression(call.expression)) {
    return undefined
  }
  return propertyInvocation(call.expression, typePaths, aggregateVariables, importedConcepts)
}

function domainServiceFunctionInvocation(
  expression: ts.Identifier,
  importedConcepts: ReadonlyMap<string, DomainConcept>,
): InvocationGuideEntry | undefined {
  const concept = importedConcepts.get(expression.text)
  return concept?.role === 'domain-service'
    ? { concept: concept.name, operation: concept.name, role: concept.role }
    : undefined
}

function propertyInvocation(
  expression: ts.PropertyAccessExpression,
  typePaths: ReadonlyMap<string, string>,
  aggregateVariables: ReadonlyMap<string, string>,
  importedConcepts: ReadonlyMap<string, DomainConcept>,
): InvocationGuideEntry | undefined {
  const receiverPath = expressionPath(expression.expression)
  const operation = expression.name.text
  const receiverType = receiverPath === undefined ? undefined : typePaths.get(receiverPath)
  const typedConcept = receiverType === undefined ? undefined : importedConcepts.get(receiverType)
  if (typedConcept !== undefined) {
    return { concept: typedConcept.name, operation, role: typedConcept.role }
  }
  const aggregate = receiverPath === undefined ? undefined : aggregateVariables.get(receiverPath)
  if (aggregate !== undefined) {
    return { concept: aggregate, operation, role: 'aggregate' }
  }
  const staticConcept = ts.isIdentifier(expression.expression)
    ? importedConcepts.get(expression.expression.text)
    : undefined
  if (staticConcept?.role === 'aggregate') {
    return { concept: staticConcept.name, operation, role: staticConcept.role }
  }
  return undefined
}

function aggregateVariableTypes(
  declaration: AnnotatedDeclaration['declaration'],
  typePaths: ReadonlyMap<string, string>,
  repositoryReturns: ReadonlyMap<string, ReadonlyMap<string, string>>,
  helperReturns: ReadonlyMap<string, string>,
  importedConcepts: ReadonlyMap<string, DomainConcept>,
): ReadonlyMap<string, string> {
  const variables = new Map<string, string>()
  visit(declaration, (node) => {
    if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name)) {
      return
    }
    const aggregate = aggregateFromExpression(
      node.initializer,
      typePaths,
      repositoryReturns,
      helperReturns,
      importedConcepts,
    )
    if (aggregate !== undefined) {
      variables.set(node.name.text, aggregate)
    }
  })
  return variables
}

function aggregateFromExpression(
  expression: ts.Expression | undefined,
  typePaths: ReadonlyMap<string, string>,
  repositoryReturns: ReadonlyMap<string, ReadonlyMap<string, string>>,
  helperReturns: ReadonlyMap<string, string>,
  importedConcepts: ReadonlyMap<string, DomainConcept>,
): string | undefined {
  if (expression === undefined || !ts.isCallExpression(expression)) {
    return undefined
  }
  if (ts.isIdentifier(expression.expression)) {
    return helperReturns.get(expression.expression.text)
  }
  if (!ts.isPropertyAccessExpression(expression.expression)) {
    return undefined
  }
  const receiverPath = expressionPath(expression.expression.expression)
  const receiverType = receiverPath === undefined ? undefined : typePaths.get(receiverPath)
  const repositoryMethods =
    receiverType === undefined ? undefined : repositoryReturns.get(receiverType)
  const repositoryAggregate = repositoryMethods?.get(expression.expression.name.text)
  if (repositoryAggregate !== undefined) {
    return repositoryAggregate
  }
  const staticConcept = ts.isIdentifier(expression.expression.expression)
    ? importedConcepts.get(expression.expression.expression.text)
    : undefined
  return staticConcept?.role === 'aggregate' ? staticConcept.name : undefined
}

function localHelperReturns(
  sourceFile: ts.SourceFile,
  repositoryReturns: ReadonlyMap<string, ReadonlyMap<string, string>>,
  importedConcepts: ReadonlyMap<string, DomainConcept>,
): ReadonlyMap<string, string> {
  const helpers = new Map<string, string>()
  for (const statement of sourceFile.statements) {
    if (!ts.isFunctionDeclaration(statement) || statement.name === undefined) {
      continue
    }
    const helperName = statement.name.text
    const typePaths = parameterTypePaths(statement.parameters, sourceFile)
    visit(statement, (node) => {
      if (!ts.isReturnStatement(node)) {
        return
      }
      const aggregate = aggregateFromExpression(
        node.expression,
        typePaths,
        repositoryReturns,
        new Map(),
        importedConcepts,
      )
      if (aggregate !== undefined) {
        helpers.set(helperName, aggregate)
      }
    })
  }
  return helpers
}
