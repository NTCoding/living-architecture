const {
  implementsInterface,
  findInstanceProperty,
  hasStringLiteralValue,
  getValueTypeDescription,
} = require('./interface-ast-predicates.cjs')

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Require EventDef implementations to have type property with literal value' },
    schema: [],
    messages: {
      missingType: "Class '{{className}}' implements EventDef but is missing 'type' property",
      typeNotLiteral: "Class '{{className}}' has 'type' property but value must be a string literal, not {{actualType}}",
    },
  },
  create(context) {
    return {
      ClassDeclaration(node) {
        /* v8 ignore next -- ClassDeclaration always has id (name) */
        if (!node.id) return
        if (!implementsInterface(node, 'EventDef')) return

        const className = node.id.name
        const typeProperty = findInstanceProperty(node, 'type')

        if (!typeProperty) {
          context.report({
            node: node.id,
            messageId: 'missingType',
            data: { className },
          })
        } else if (!hasStringLiteralValue(typeProperty)) {
          context.report({
            node: typeProperty,
            messageId: 'typeNotLiteral',
            data: {
              className,
              actualType: getValueTypeDescription(typeProperty),
            },
          })
        }
      },
    }
  },
}
