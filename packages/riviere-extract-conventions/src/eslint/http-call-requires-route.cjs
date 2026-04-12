function findHttpCallDecoratorExpression(decorators) {
  for (const decorator of decorators) {
    const expression = decorator.expression
    if (expression.type === 'Identifier' && expression.name === 'HttpCall') {
      return expression
    }
    if (expression.type !== 'CallExpression') {
      continue
    }
    if (expression.callee.type !== 'Identifier' || expression.callee.name !== 'HttpCall') {
      continue
    }
    return expression
  }
  return null
}

function getRouteViolation(decoratorExpression) {
  if (decoratorExpression.type === 'Identifier') {
    return 'missingRoute'
  }
  if (decoratorExpression.arguments.length === 0) {
    return 'missingRoute'
  }

  const firstArgument = decoratorExpression.arguments[0]
  if (firstArgument.type !== 'Literal' || typeof firstArgument.value !== 'string') {
    return 'routeNotLiteral'
  }

  if (firstArgument.value.trim().length === 0) {
    return 'emptyRoute'
  }

  return null
}

function getMethodViolation(decoratorExpression) {
  if (decoratorExpression.arguments.length < 2) {
    return 'missingMethod'
  }

  const secondArgument = decoratorExpression.arguments[1]
  if (secondArgument.type !== 'Literal' || typeof secondArgument.value !== 'string') {
    return 'methodNotLiteral'
  }

  if (secondArgument.value.trim().length === 0) {
    return 'emptyMethod'
  }

  return null
}

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Require HttpCall decorator to include route and method' },
    schema: [],
    messages: {
      missingRoute: "Method '{{methodName}}' uses @HttpCall but is missing route argument",
      missingMethod: "Method '{{methodName}}' uses @HttpCall but is missing method argument",
      routeNotLiteral: "Method '{{methodName}}' uses @HttpCall but route must be a string literal",
      methodNotLiteral: "Method '{{methodName}}' uses @HttpCall but method must be a string literal",
      emptyRoute: "Method '{{methodName}}' uses @HttpCall but route must be non-empty",
      emptyMethod: "Method '{{methodName}}' uses @HttpCall but method must be non-empty",
    },
  },
  create(context) {
    return {
      MethodDefinition(node) {
        if (node.key.type !== 'Identifier' || !node.decorators) {
          return
        }

        const decoratorExpression = findHttpCallDecoratorExpression(node.decorators)
        if (!decoratorExpression) {
          return
        }

        const violation = getRouteViolation(decoratorExpression)
        if (!violation) {
          const methodViolation = getMethodViolation(decoratorExpression)
          if (!methodViolation) {
            return
          }

          context.report({
            node: node.key,
            messageId: methodViolation,
            data: { methodName: node.key.name },
          })
          return
        }

        context.report({
          node: node.key,
          messageId: violation,
          data: { methodName: node.key.name },
        })
      },
    }
  },
}
