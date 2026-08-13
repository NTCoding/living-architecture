function findHttpClientDecoratorExpression(decorators) {
  for (const decorator of decorators) {
    const expression = decorator.expression
    if (expression.type === 'Identifier' && expression.name === 'HttpClient') {
      return expression
    }
    if (expression.type !== 'CallExpression') {
      continue
    }
    if (expression.callee.type !== 'Identifier' || expression.callee.name !== 'HttpClient') {
      continue
    }
    return expression
  }
  return null
}

function getServiceNameViolation(callExpression) {
  if (callExpression.type === 'Identifier') {
    return 'missingServiceName'
  }

  if (callExpression.arguments.length === 0) {
    return 'missingServiceName'
  }

  const firstArgument = callExpression.arguments[0]
  if (firstArgument.type !== 'Literal' || typeof firstArgument.value !== 'string') {
    return 'serviceNameNotLiteral'
  }

  if (firstArgument.value.trim().length === 0) {
    return 'emptyServiceName'
  }

  return null
}

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Require HttpClient decorator to include service name' },
    schema: [],
    messages: {
      missingServiceName:
        "Class '{{className}}' uses @HttpClient but is missing service name argument",
      serviceNameNotLiteral:
        "Class '{{className}}' uses @HttpClient but service name must be a string literal",
      emptyServiceName: "Class '{{className}}' uses @HttpClient but service name must be non-empty",
    },
  },
  create(context) {
    return {
      ClassDeclaration(node) {
        if (!node.id || !node.decorators) {
          return
        }

        const decoratorCall = findHttpClientDecoratorExpression(node.decorators)
        if (!decoratorCall) {
          return
        }

        const violation = getServiceNameViolation(decoratorCall)
        if (!violation) {
          return
        }

        context.report({
          node: node.id,
          messageId: violation,
          data: { className: node.id.name },
        })
      },
    }
  },
}
