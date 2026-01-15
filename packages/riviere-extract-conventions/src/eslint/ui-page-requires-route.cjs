const {
  implementsInterface,
  findInstanceProperty,
  hasStringLiteralValue,
  getValueTypeDescription,
} = require('./interface-ast-predicates.cjs')

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Require UIPageDef implementations to have route property with literal value' },
    schema: [],
    messages: {
      missingRoute: "Class '{{className}}' implements UIPageDef but is missing 'route' property",
      routeNotLiteral: "Class '{{className}}' has 'route' property but value must be a string literal, not {{actualType}}",
    },
  },
  create(context) {
    return {
      ClassDeclaration(node) {
        /* v8 ignore next -- ClassDeclaration always has id (name) */
        if (!node.id) return
        if (!implementsInterface(node, 'UIPageDef')) return

        const className = node.id.name
        const routeProperty = findInstanceProperty(node, 'route')

        if (!routeProperty) {
          context.report({
            node: node.id,
            messageId: 'missingRoute',
            data: { className },
          })
        } else if (!hasStringLiteralValue(routeProperty)) {
          context.report({
            node: routeProperty,
            messageId: 'routeNotLiteral',
            data: {
              className,
              actualType: getValueTypeDescription(routeProperty),
            },
          })
        }
      },
    }
  },
}
