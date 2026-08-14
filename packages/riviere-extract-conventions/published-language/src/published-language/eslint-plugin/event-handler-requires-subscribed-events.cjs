const {
  hasDecorator,
  findInstanceProperty,
  hasStringLiteralArrayValue,
  getValueTypeDescription,
} = require('./interface-ast-predicates.cjs')

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Require @EventHandlerContainer classes to have subscribedEvents array with literal values' },
    schema: [],
    messages: {
      missingSubscribedEvents: "Class '{{className}}' has @EventHandlerContainer but is missing 'subscribedEvents' property",
      subscribedEventsNotLiteralArray: "Class '{{className}}' has 'subscribedEvents' property but value must be an array of string literals, not {{actualType}}",
    },
  },
  create(context) {
    return {
      ClassDeclaration(node) {
        /* v8 ignore next -- ESLint ClassDeclaration visitor guarantees node.id exists per estree spec; structurally unreachable */
        if (!node.id) return
        if (!hasDecorator(node, 'EventHandlerContainer')) return

        const className = node.id.name
        const subscribedEventsProperty = findInstanceProperty(node, 'subscribedEvents')

        if (!subscribedEventsProperty) {
          context.report({
            node: node.id,
            messageId: 'missingSubscribedEvents',
            data: { className },
          })
        } else if (!hasStringLiteralArrayValue(subscribedEventsProperty)) {
          context.report({
            node: subscribedEventsProperty,
            messageId: 'subscribedEventsNotLiteralArray',
            data: {
              className,
              actualType: getValueTypeDescription(subscribedEventsProperty),
            },
          })
        }
      },
    }
  },
}
