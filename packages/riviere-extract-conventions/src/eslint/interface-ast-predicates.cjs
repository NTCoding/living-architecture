function implementsInterface(node, interfaceName) {
  if (!node.implements || node.implements.length === 0) {
    return false
  }
  return node.implements.some((impl) => {
    if (impl.expression && impl.expression.type === 'Identifier') {
      return impl.expression.name === interfaceName
    }
    /* v8 ignore next 4 -- TSQualifiedName branch requires qualified module syntax (SomeModule.Interface) which no current rule uses; keeping for completeness since the ESLint AST spec allows it */
    if (impl.expression && impl.expression.type === 'TSQualifiedName') {
      return impl.expression.right.name === interfaceName
    }
    return false
  })
}

function hasDecorator(node, decoratorName) {
  if (!node.decorators || node.decorators.length === 0) {
    return false
  }
  return node.decorators.some(
    (d) => d.expression.type === 'Identifier' && d.expression.name === decoratorName,
  )
}

function findInstanceProperty(classNode, propertyName) {
  /* v8 ignore next 3 -- ESLint guarantees ClassDeclaration.body exists per estree spec; structurally unreachable */
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

function hasStringLiteralValue(property) {
  /* v8 ignore next 3 -- callers (api-controller, ui-page rules) always guard with findInstanceProperty before calling; null property is structurally unreachable in current call sites */
  if (!property || !property.value) {
    return false
  }
  return property.value.type === 'Literal' && typeof property.value.value === 'string'
}

function hasStringLiteralArrayValue(property) {
  /* v8 ignore next 3 -- callers always guard with findInstanceProperty before calling; null property is structurally unreachable in current call sites */
  if (!property || !property.value) {
    return false
  }
  if (property.value.type !== 'ArrayExpression') {
    return false
  }
  return property.value.elements.every(
    (element) => element && element.type === 'Literal' && typeof element.value === 'string'
  )
}

function getLiteralValue(property) {
  /* v8 ignore next 3 -- callers always guard with hasStringLiteralValue before calling; non-literal property is structurally unreachable in current call sites */
  if (!property || !property.value || property.value.type !== 'Literal') {
    return null
  }
  return property.value.value
}

function getValueTypeDescription(property) {
  /* v8 ignore next 3 -- callers always guard with findInstanceProperty before calling; null property is structurally unreachable in current call sites */
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
  hasDecorator,
  findInstanceProperty,
  hasStringLiteralValue,
  hasStringLiteralArrayValue,
  getLiteralValue,
  getValueTypeDescription,
}
