function hasDecoratorNamed(decorators, decoratorName) {
  /* v8 ignore next 3 -- typescript-eslint provides an array for decorators on class and method nodes; undefined is structurally unreachable in current parser output */
  if (!decorators) {
    return false
  }
  return decorators.some((decorator) => {
    const expression = decorator.expression
    if (expression.type === 'Identifier') {
      return expression.name === decoratorName
    }
    return (
      expression.type === 'CallExpression' &&
      expression.callee.type === 'Identifier' &&
      expression.callee.name === decoratorName
    )
  })
}

function isMethodWithHttpCallDecorator(member) {
  if (member.type !== 'MethodDefinition') {
    return false
  }
  if (member.key.type !== 'Identifier') {
    return false
  }
  return hasDecoratorNamed(member.decorators, 'HttpCall')
}

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Require HttpCall methods to be inside HttpClient classes' },
    schema: [],
    messages: {
      missingHttpClientContainer:
        "Method '{{methodName}}' uses @HttpCall but its class '{{className}}' is missing @HttpClient",
    },
  },
  create(context) {
    return {
      ClassDeclaration(node) {
        if (!node.id) {
          return
        }

        const hasHttpClientDecorator = hasDecoratorNamed(node.decorators, 'HttpClient')
        if (hasHttpClientDecorator) {
          return
        }

        for (const member of node.body.body) {
          if (!isMethodWithHttpCallDecorator(member)) {
            continue
          }

          context.report({
            node: member.key,
            messageId: 'missingHttpClientContainer',
            data: {
              className: node.id.name,
              methodName: member.key.name,
            },
          })
        }
      },
    }
  },
}
