/** @riviere-role published-language-union */
export type CustomPropertyTypeName = 'string' | 'number' | 'boolean' | 'array' | 'object'

type CustomPropertyTypeParseResult =
  | { success: true; propertyType: CustomPropertyType }
  | { success: false; invalidValue: string }

const CUSTOM_PROPERTY_TYPE_NAMES: readonly CustomPropertyTypeName[] = [
  'string',
  'number',
  'boolean',
  'array',
  'object',
]

/** @riviere-role value-object */
export class CustomPropertyType {
  declare private readonly brand: 'CustomPropertyType'

  private constructor(private readonly propertyTypeName: CustomPropertyTypeName) {}

  static parse(value: string): CustomPropertyTypeParseResult {
    const propertyTypeName = CUSTOM_PROPERTY_TYPE_NAMES.find((candidate) => candidate === value)
    return propertyTypeName === undefined
      ? { success: false, invalidValue: value }
      : { success: true, propertyType: new CustomPropertyType(propertyTypeName) }
  }

  name(): CustomPropertyTypeName {
    return this.propertyTypeName
  }

  static names(): readonly CustomPropertyTypeName[] {
    return CUSTOM_PROPERTY_TYPE_NAMES
  }
}
