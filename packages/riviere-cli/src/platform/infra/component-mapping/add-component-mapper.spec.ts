import {
  describe, expect, it 
} from 'vitest'
import { buildDomainInput } from './add-component-mapper'
import { MissingRequiredOptionError } from '../errors/errors'

describe('buildDomainInput', () => {
  const validInput = {
    componentType: 'UI',
    name: 'TestComponent',
    domain: 'test-domain',
    module: 'test-module',
    repository: 'test-repo',
    filePath: '/path/to/file.ts',
    graphPath: '/path/to/graph.json',
    route: '/test',
    outputJson: true,
  }

  it('throws MissingRequiredOptionError for unknown component type', () => {
    const input = {
      ...validInput,
      componentType: 'InvalidType',
    }
    expect(() => buildDomainInput(input)).toThrow(MissingRequiredOptionError)
    expect(() => buildDomainInput(input)).toThrow('--type is required for Component component')
  })
})
