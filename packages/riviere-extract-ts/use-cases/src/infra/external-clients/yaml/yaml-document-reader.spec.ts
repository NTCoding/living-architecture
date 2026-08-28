import { describe, expect, it } from 'vitest'
import { YamlDocumentError, YamlDocumentReader } from './yaml-document-reader'

describe('YamlDocumentReader', () => {
  it('reads YAML values without adding document semantics', () => {
    const yaml = YamlDocumentReader.parse('name: workflow\nenabled: true\nitems: [one]\n')
    const root = yaml.record(yaml.value(), 'root')

    expect(yaml.string(root['name'], 'name')).toBe('workflow')
    expect(yaml.optionalBoolean(root['enabled'])).toBe(true)
    expect(yaml.array(root['items'], 'items')).toStrictEqual(['one'])
    expect(yaml.optionalString(undefined)).toBeUndefined()
  })

  it('does not coerce optional values', () => {
    const yaml = YamlDocumentReader.parse('{}')
    expect(yaml.optionalString('workflow')).toBe('workflow')
    expect(yaml.optionalBoolean('true')).toBeUndefined()
    expect(yaml.optionalString(true)).toBeUndefined()
  })

  it.each([
    ['record', () => YamlDocumentReader.parse('value').record('value', 'root'), 'object'],
    ['array', () => YamlDocumentReader.parse('items: []').array([], 'items'), 'non-empty array'],
    ['string', () => YamlDocumentReader.parse('name: ""').string('', 'name'), 'non-empty string'],
  ])('rejects invalid %s values', (_name, read, message) => {
    expect(read).toThrow(message)
    expect(read).toThrow(YamlDocumentError)
  })

  it('translates YAML parser failures', () => {
    expect(() => YamlDocumentReader.parse('value: [')).toThrow(YamlDocumentError)
  })
})
