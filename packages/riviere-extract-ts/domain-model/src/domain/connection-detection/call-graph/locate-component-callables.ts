import type { Project } from 'ts-morph'
import type { EnrichedComponent } from '../../value-extraction/enriched-component'
import { CallableReference } from './callable-reference'
import { ComponentCallable } from './scoped-call-graph'

/** @riviere-role domain-service */
export function locateComponentCallables(
  project: Project,
  components: readonly EnrichedComponent[],
): ComponentCallable[] {
  return components.flatMap((component) => locateComponentCallable(project, component))
}

function locateComponentCallable(
  project: Project,
  component: EnrichedComponent,
): ComponentCallable[] {
  const sourceFile = project.getSourceFile(component.location.file)
  if (sourceFile === undefined) return []

  const classDeclaration = sourceFile
    .getClasses()
    .find((candidate) => candidate.getStartLineNumber() === component.location.line)
  if (classDeclaration !== undefined) {
    const containerTypeName = classDeclaration.getName() ?? component.name
    return classDeclaration.getMethods().map((method) =>
      componentCallable(
        component,
        CallableReference.parse({
          kind: 'method',
          filePath: sourceFile.getFilePath(),
          lineNumber: method.getStartLineNumber(),
          callableName: method.getName(),
          containerTypeName,
        }),
      ),
    )
  }

  for (const candidateClass of sourceFile.getClasses()) {
    const method = candidateClass
      .getMethods()
      .find((candidate) => candidate.getStartLineNumber() === component.location.line)
    if (method !== undefined) {
      const containerTypeName = candidateClass.getName()
      return [
        componentCallable(
          component,
          CallableReference.parse({
            kind: 'method',
            filePath: sourceFile.getFilePath(),
            lineNumber: method.getStartLineNumber(),
            callableName: method.getName(),
            ...(containerTypeName === undefined ? {} : { containerTypeName }),
          }),
        ),
      ]
    }
  }

  const functionDeclaration = sourceFile
    .getFunctions()
    .find((candidate) => candidate.getStartLineNumber() === component.location.line)
  if (functionDeclaration === undefined) return []
  return [
    componentCallable(
      component,
      CallableReference.parse({
        kind: 'function',
        filePath: sourceFile.getFilePath(),
        lineNumber: functionDeclaration.getStartLineNumber(),
        callableName: functionDeclaration.getNameOrThrow(),
      }),
    ),
  ]
}

function componentCallable(
  component: EnrichedComponent,
  callable: CallableReference,
): ComponentCallable {
  return ComponentCallable.parse({ component, callable })
}
