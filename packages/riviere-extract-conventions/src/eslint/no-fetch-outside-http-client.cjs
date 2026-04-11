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

function getEnclosingClassDeclaration(sourceCode, node) {
  const ancestors = sourceCode.getAncestors(node)
  for (let index = ancestors.length - 1; index >= 0; index -= 1) {
    const ancestor = ancestors[index]
    if (ancestor.type === 'ClassDeclaration') {
      return ancestor
    }
  }
  return null
}

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow fetch usage outside HttpClient classes' },
    schema: [],
    messages: {
      fetchOutsideHttpClient:
        "Call to '{{calleeName}}' is only allowed inside classes decorated with @HttpClient",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.type !== 'Identifier' || node.callee.name !== 'fetch') {
          return
        }

        const enclosingClass = getEnclosingClassDeclaration(context.sourceCode, node)
        if (enclosingClass && hasDecoratorNamed(enclosingClass.decorators, 'HttpClient')) {
          return
        }

        context.report({
          node,
          messageId: 'fetchOutsideHttpClient',
          data: { calleeName: 'fetch' },
        })
      },
    }
  },
}
