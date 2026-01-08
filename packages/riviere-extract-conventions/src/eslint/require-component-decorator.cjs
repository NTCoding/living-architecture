const COMPONENT_DECORATORS = [
  'DomainOpContainer',
  'APIContainer',
  'EventHandlerContainer',
  'UseCase',
  'Event',
  'UI',
  'Ignore',
]

const CALL_EXPRESSION_DECORATORS = ['Custom']

function getDecoratorName(expression) {
  if (expression.type === 'Identifier') {
    return expression.name
  }
  if (expression.type === 'CallExpression' && expression.callee.type === 'Identifier') {
    return expression.callee.name
  }
  return null
}

function hasComponentDecorator(decorators) {
  return decorators.some((decorator) => {
    const name = getDecoratorName(decorator.expression)
    if (name === null) return false
    return COMPONENT_DECORATORS.includes(name) || CALL_EXPRESSION_DECORATORS.includes(name)
  })
}

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Require classes to have a component decorator' },
    schema: [],
    messages: {
      missingDecorator:
        "Class '{{className}}' requires a component decorator. Add one of: @UseCase, @Event, @UI, @DomainOpContainer, @APIContainer, @EventHandlerContainer, @Custom('type'), or @Ignore",
    },
  },
  create(context) {
    return {
      ClassDeclaration(node) {
        if (!node.id) return
        if (hasComponentDecorator(node.decorators)) return

        context.report({
          node: node.id,
          messageId: 'missingDecorator',
          data: { className: node.id.name },
        })
      },
    }
  },
}
