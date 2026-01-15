const {
  implementsInterface,
  findInstanceProperty,
  hasLiteralArrayValue,
  getValueTypeDescription,
} = require('./interface-utils.cjs')

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Require EventHandlerDef implementations to have subscribedEvents array with literal values' },
    schema: [],
    messages: {
      missingSubscribedEvents: "Class '{{className}}' implements EventHandlerDef but is missing 'subscribedEvents' property",
      subscribedEventsNotLiteralArray: "Class '{{className}}' has 'subscribedEvents' property but value must be an array of string literals, not {{actualType}}",
    },
  },
  create(context) {
    return {
      ClassDeclaration(node) {
        /* v8 ignore next -- ClassDeclaration always has id (name) */
        if (!node.id) return
        if (!implementsInterface(node, 'EventHandlerDef')) return

        const className = node.id.name
        const subscribedEventsProperty = findInstanceProperty(node, 'subscribedEvents')

        if (!subscribedEventsProperty) {
          context.report({
            node: node.id,
            messageId: 'missingSubscribedEvents',
            data: { className },
          })
        } else if (!hasLiteralArrayValue(subscribedEventsProperty)) {
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
