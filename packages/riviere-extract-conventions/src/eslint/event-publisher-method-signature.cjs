const { hasDecorator } = require('./interface-ast-predicates.cjs')

let getParserServices = null
try {
  getParserServices = require('@typescript-eslint/utils').ESLintUtils.getParserServices
/* v8 ignore next -- soft-require: package always present in this repo */
} catch { /* type checking unavailable */ }

function getTypeReferenceName(typeAnnotation) {
  const typeName = typeAnnotation.typeName
  if (typeName.type === 'TSQualifiedName') {
    return typeName.right.name
  }
  return typeName.name
}

function checkEventTypeShape(checker, services, param, typeAnnotation) {
  if (!checker || !services) return null

  const tsParam = services.esTreeNodeToTSNodeMap.get(param)
  const paramType = checker.getTypeAtLocation(tsParam)
  const typeProperty = paramType.getProperty('type')
  const referenceName = getTypeReferenceName(typeAnnotation)

  if (!typeProperty) {
    return referenceName
  }

  const typePropertyType = checker.getTypeOfSymbol(typeProperty)
  const stringType = checker.getStringType()
  if (!checker.isTypeAssignableTo(typePropertyType, stringType)) {
    return referenceName
  }

  return null
}

function checkMethod(context, member, className, checker, services) {
  const methodName = member.key.name

  if (member.accessibility === 'private' || member.accessibility === 'protected') {
    context.report({
      node: member.key,
      messageId: 'nonPublicMethod',
      data: {
        methodName,
        className,
        accessibility: member.accessibility,
      },
    })
    return
  }

  const params = member.value.params

  if (params.length === 0) {
    context.report({
      node: member.key,
      messageId: 'missingParameter',
      data: {
        methodName,
        className,
      },
    })
    return
  }

  if (params.length > 1) {
    context.report({
      node: member.key,
      messageId: 'tooManyParameters',
      data: {
        methodName,
        className,
      },
    })
    return
  }

  const param = params[0]
  const typeAnnotation = param.typeAnnotation && param.typeAnnotation.typeAnnotation

  if (!typeAnnotation) {
    context.report({
      node: member.key,
      messageId: 'missingTypeAnnotation',
      data: {
        methodName,
        className,
      },
    })
    return
  }

  if (typeAnnotation.type !== 'TSTypeReference') {
    context.report({
      node: member.key,
      messageId: 'notTypeReference',
      data: {
        methodName,
        className,
      },
    })
    return
  }

  const failedTypeName = checkEventTypeShape(checker, services, param, typeAnnotation)
  if (failedTypeName) {
    context.report({
      node: member.key,
      messageId: 'invalidEventType',
      data: {
        typeName: failedTypeName,
        methodName,
        className,
      },
    })
  }
}

function isMethodToCheck(member) {
  return (
    member.type === 'MethodDefinition' &&
    member.kind !== 'constructor' &&
    member.kind !== 'get' &&
    member.kind !== 'set'
  )
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require @EventPublisherContainer methods to have exactly one typed event parameter',
      requiresTypeChecking: true,
      examples: {
        valid: "@EventPublisherContainer class OrderPublisher { publish(event: OrderPlacedEvent): void {} }",
        invalid: "@EventPublisherContainer class OrderPublisher { publish(): void {} }",
      },
    },
    schema: [],
    messages: {
      missingParameter: "Method '{{methodName}}' on @EventPublisherContainer class '{{className}}' must have exactly one parameter",
      tooManyParameters: "Method '{{methodName}}' on @EventPublisherContainer class '{{className}}' must have exactly one parameter",
      missingTypeAnnotation: "Parameter of method '{{methodName}}' on @EventPublisherContainer class '{{className}}' must have a type annotation",
      notTypeReference: "Parameter of method '{{methodName}}' on @EventPublisherContainer class '{{className}}' must have a type reference annotation",
      invalidEventType: "Parameter type '{{typeName}}' of method '{{methodName}}' on @EventPublisherContainer class '{{className}}' must have a 'type: string' property",
      nonPublicMethod: "Method '{{methodName}}' on @EventPublisherContainer class '{{className}}' must be public, but is {{accessibility}}",
    },
  },
  create(context) {
    let services = null
    let checker = null
    /* v8 ignore start -- graceful degradation: getParserServices always available in this repo */
    if (getParserServices) {
      try {
        services = getParserServices(context, true)
        checker = services.program?.getTypeChecker() ?? null
      } catch { /* no type info */ }
    }
    /* v8 ignore stop */

    return {
      ClassDeclaration(node) {
        /* v8 ignore next -- ClassDeclaration always has id (name) */
        if (!node.id) return
        if (!hasDecorator(node, 'EventPublisherContainer')) return

        const className = node.id.name

        for (const member of node.body.body) {
          if (isMethodToCheck(member)) {
            checkMethod(context, member, className, checker, services)
          }
        }
      },
    }
  },
}
