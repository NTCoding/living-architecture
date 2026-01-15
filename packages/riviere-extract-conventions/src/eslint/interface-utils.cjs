/**
 * Shared utilities for ESLint rules that check interface implementations.
 */

/**
 * Checks if a class implements a specific interface by name.
 * @param {object} node - ClassDeclaration AST node
 * @param {string} interfaceName - Name of interface to check
 * @returns {boolean} True if class implements the interface
 */
function implementsInterface(node, interfaceName) {
  if (!node.implements || node.implements.length === 0) {
    return false
  }
  return node.implements.some((impl) => {
    // Handle simple identifier: implements APIControllerDef
    if (impl.expression && impl.expression.type === 'Identifier') {
      return impl.expression.name === interfaceName
    }
    // Handle qualified name: implements SomeModule.APIControllerDef
    /* v8 ignore next 4 -- defensive check: implements array always has expression */
    if (impl.expression && impl.expression.type === 'TSQualifiedName') {
      return impl.expression.right.name === interfaceName
    }
    return false
  })
}

/**
 * Finds an instance property (non-static) by name in class body.
 * @param {object} classNode - ClassDeclaration AST node
 * @param {string} propertyName - Name of property to find
 * @returns {object|null} PropertyDefinition node or null
 */
function findInstanceProperty(classNode, propertyName) {
  /* v8 ignore next 3 -- defensive check: ClassDeclaration always has body in practice */
  if (!classNode.body || !classNode.body.body) {
    return null
  }
  return classNode.body.body.find((member) => {
    return (
      member.type === 'PropertyDefinition' &&
      member.static !== true &&
      member.key &&
      member.key.type === 'Identifier' &&
      member.key.name === propertyName
    )
  }) || null
}

/**
 * Checks if a property has a literal value (string, number, boolean).
 * @param {object} property - PropertyDefinition AST node
 * @returns {boolean} True if value is a literal
 */
function hasLiteralValue(property) {
  /* v8 ignore next 3 -- defensive check: rules always check property existence first */
  if (!property || !property.value) {
    return false
  }
  return property.value.type === 'Literal'
}

/**
 * Checks if a property has an array literal value with only literal elements.
 * @param {object} property - PropertyDefinition AST node
 * @returns {boolean} True if value is an array of literals
 */
function hasLiteralArrayValue(property) {
  /* v8 ignore next 3 -- defensive check: rules always check property existence first */
  if (!property || !property.value) {
    return false
  }
  if (property.value.type !== 'ArrayExpression') {
    return false
  }
  return property.value.elements.every(
    (element) => element && element.type === 'Literal'
  )
}

/**
 * Gets the literal value from a property, or null if not a literal.
 * @param {object} property - PropertyDefinition AST node
 * @returns {*} The literal value or null
 */
function getLiteralValue(property) {
  /* v8 ignore next 3 -- defensive check: rules always check property existence first */
  if (!property || !property.value || property.value.type !== 'Literal') {
    return null
  }
  return property.value.value
}

/**
 * Gets a human-readable type description for error messages.
 * @param {object} property - PropertyDefinition AST node
 * @returns {string} Type description
 */
function getValueTypeDescription(property) {
  /* v8 ignore next 3 -- defensive check: only called when property exists */
  if (!property || !property.value) {
    return 'undefined'
  }
  const valueType = property.value.type
  if (valueType === 'Identifier') {
    return `variable reference '${property.value.name}'`
  }
  if (valueType === 'MemberExpression') {
    return 'member expression (possibly an enum)'
  }
  if (valueType === 'CallExpression') {
    return 'function call'
  }
  if (valueType === 'TemplateLiteral') {
    return 'template literal'
  }
  return valueType
}

module.exports = {
  implementsInterface,
  findInstanceProperty,
  hasLiteralValue,
  hasLiteralArrayValue,
  getLiteralValue,
  getValueTypeDescription,
}
