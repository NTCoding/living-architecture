const {
  implementsInterface,
  findInstanceProperty,
  hasStringLiteralValue,
  getLiteralValue,
  getValueTypeDescription,
} = require('./interface-ast-predicates.cjs')

const VALID_HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Require APIControllerDef implementations to have route and method with literal values' },
    schema: [],
    messages: {
      missingRoute: "Class '{{className}}' implements APIControllerDef but is missing 'route' property",
      missingMethod: "Class '{{className}}' implements APIControllerDef but is missing 'method' property",
      routeNotLiteral: "Class '{{className}}' has 'route' property but value must be a string literal, not {{actualType}}",
      methodNotLiteral: "Class '{{className}}' has 'method' property but value must be a string literal, not {{actualType}}",
      invalidHttpMethod: "Class '{{className}}' has invalid HTTP method '{{value}}'. Must be one of: GET, POST, PUT, PATCH, DELETE",
    },
  },
  create(context) {
    return {
      ClassDeclaration(node) {
        /* v8 ignore next -- ClassDeclaration always has id (name) */
        if (!node.id) return
        if (!implementsInterface(node, 'APIControllerDef')) return

        const className = node.id.name
        const routeProperty = findInstanceProperty(node, 'route')
        const methodProperty = findInstanceProperty(node, 'method')

        // Check route property
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

        // Check method property
        if (!methodProperty) {
          context.report({
            node: node.id,
            messageId: 'missingMethod',
            data: { className },
          })
        } else if (!hasStringLiteralValue(methodProperty)) {
          context.report({
            node: methodProperty,
            messageId: 'methodNotLiteral',
            data: {
              className,
              actualType: getValueTypeDescription(methodProperty),
            },
          })
        } else {
          const methodValue = getLiteralValue(methodProperty)
          if (!VALID_HTTP_METHODS.includes(methodValue)) {
            context.report({
              node: methodProperty,
              messageId: 'invalidHttpMethod',
              data: {
                className,
                value: methodValue,
              },
            })
          }
        }
      },
    }
  },
}
