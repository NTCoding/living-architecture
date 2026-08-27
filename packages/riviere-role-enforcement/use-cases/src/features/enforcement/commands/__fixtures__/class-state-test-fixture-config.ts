import { configWithGenericAggregateOverride } from './test-fixture-config'

export function configWithGenericClassStateConstraints() {
  return configWithGenericAggregateOverride({
    targets: ['class'],
    requiredPrivateMembers: ['brand'],
    requiresDataMembers: true,
    forbiddenCallableDataMembers: true,
    requiresPrivateConstructor: true,
    requiredStaticFactoryMethodNamePrefixes: ['parse', 'from'],
    requiresStaticFactoryMethodParameters: true,
  })
}
