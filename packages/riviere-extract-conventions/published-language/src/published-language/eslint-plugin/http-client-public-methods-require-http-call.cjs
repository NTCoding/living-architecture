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

function isPublicInstanceMethod(member) {
  if (member.type !== 'MethodDefinition') {
    return false
  }
  if (member.kind === 'constructor' || member.kind === 'get' || member.kind === 'set') {
    return false
  }
  if (member.static) {
    return false
  }
  if (member.accessibility === 'private' || member.accessibility === 'protected') {
    return false
  }
  return member.key.type === 'Identifier'
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {description: 'Require public methods in HttpClient classes to have HttpCall decorator',},
    schema: [],
    messages: {
      missingHttpCall:
        "Public method '{{methodName}}' in @HttpClient class '{{className}}' must have @HttpCall",
    },
  },
  create(context) {
    return {
      ClassDeclaration(node) {
        if (hasDecoratorNamed(node.decorators, 'Ignore')) {
          return
        }

        if (!node.id || !hasDecoratorNamed(node.decorators, 'HttpClient')) {
          return
        }

        for (const member of node.body.body) {
          if (hasDecoratorNamed(member.decorators, 'Ignore')) {
            continue
          }
          if (!isPublicInstanceMethod(member)) {
            continue
          }
          if (hasDecoratorNamed(member.decorators, 'HttpCall')) {
            continue
          }

          context.report({
            node: member.key,
            messageId: 'missingHttpCall',
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
