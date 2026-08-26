import {
  AndPredicate,
  ExtendsClassPredicate,
  HasDecoratorPredicate,
  HasJSDocPredicate,
  ImplementsInterfacePredicate,
  InClassWithPredicate,
  NameEndsWithPredicate,
  NameMatchesPredicate,
  OrPredicate,
  type OrPredicateInput,
  type Predicate,
  type PredicateInput,
} from '@living-architecture/riviere-extract-config-published-language'
import { TestFixtureError } from '../domain/value-extraction/literal-detection'

export function parsePredicateForTest(input: PredicateInput): Predicate {
  const result = parsePredicate(input)
  if (!result.success) throw new TestFixtureError(result.errors.join(', '))
  return result.data
}

type PropertiesOf<Union> = Union extends unknown ? keyof Union : never

function hasUnionMemberProperty<
  Union extends object,
  Property extends PropertiesOf<Union>,
>(input: Union, property: Property): input is Extract<Union, Record<Property, unknown>> {
  return Object.hasOwn(input, property)
}

function parsePredicate(input: PredicateInput) {
  if (hasUnionMemberProperty(input, 'hasDecorator')) return HasDecoratorPredicate.parse(input)
  if (hasUnionMemberProperty(input, 'hasJSDoc')) return HasJSDocPredicate.parse(input)
  if (hasUnionMemberProperty(input, 'extendsClass')) return ExtendsClassPredicate.parse(input)
  if (hasUnionMemberProperty(input, 'implementsInterface')) {
    return ImplementsInterfacePredicate.parse(input)
  }
  if (hasUnionMemberProperty(input, 'nameEndsWith')) return NameEndsWithPredicate.parse(input)
  if (hasUnionMemberProperty(input, 'nameMatches')) return NameMatchesPredicate.parse(input)
  if (hasUnionMemberProperty(input, 'inClassWith')) return InClassWithPredicate.parse(input)
  if (hasUnionMemberProperty(input, 'and')) return AndPredicate.parse(input)
  input satisfies OrPredicateInput
  return OrPredicate.parse(input)
}
