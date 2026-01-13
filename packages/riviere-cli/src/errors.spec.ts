import {
  describe, it, expect 
} from 'vitest'
import {
  InvalidPackageJsonError,
  InvalidCustomPropertyError,
  MissingRequiredOptionError,
  InvalidDomainJsonError,
  InvalidComponentTypeError,
  InvalidNormalizedComponentTypeError,
  ConfigSchemaValidationError,
  InvalidConfigFormatError,
  PackageResolveError,
  ConfigFileNotFoundError,
  InternalSchemaValidationError,
  ModuleRefNotFoundError,
} from './errors'

describe('errors', () => {
  describe('InvalidPackageJsonError', () => {
    it('sets message with reason', () => {
      const error = new InvalidPackageJsonError('missing version field')
      expect(error.message).toBe('Invalid package.json: missing version field')
    })

    it('sets name', () => {
      const error = new InvalidPackageJsonError('reason')
      expect(error.name).toBe('InvalidPackageJsonError')
    })
  })

  describe('InvalidCustomPropertyError', () => {
    it('sets message with property', () => {
      const error = new InvalidCustomPropertyError('invalid-format')
      expect(error.message).toBe(
        "Invalid custom property format: invalid-format. Expected 'key:value'",
      )
    })

    it('sets name', () => {
      const error = new InvalidCustomPropertyError('prop')
      expect(error.name).toBe('InvalidCustomPropertyError')
    })

    it('exposes property', () => {
      const error = new InvalidCustomPropertyError('my-prop')
      expect(error.property).toBe('my-prop')
    })
  })

  describe('MissingRequiredOptionError', () => {
    it('sets message with option and component type', () => {
      const error = new MissingRequiredOptionError('route', 'UI')
      expect(error.message).toBe('--route is required for UI component')
    })

    it('sets name', () => {
      const error = new MissingRequiredOptionError('opt', 'Type')
      expect(error.name).toBe('MissingRequiredOptionError')
    })

    it('exposes optionName and componentType', () => {
      const error = new MissingRequiredOptionError('api-type', 'API')
      expect(error.optionName).toBe('api-type')
      expect(error.componentType).toBe('API')
    })
  })

  describe('InvalidDomainJsonError', () => {
    it('sets message with value', () => {
      const error = new InvalidDomainJsonError('{invalid}')
      expect(error.message).toBe('Invalid domain JSON: {invalid}')
    })

    it('sets name', () => {
      const error = new InvalidDomainJsonError('val')
      expect(error.name).toBe('InvalidDomainJsonError')
    })

    it('exposes value', () => {
      const error = new InvalidDomainJsonError('json-value')
      expect(error.value).toBe('json-value')
    })
  })

  describe('InvalidComponentTypeError', () => {
    it('sets message with value and valid types', () => {
      const error = new InvalidComponentTypeError('invalid', ['API', 'UI'])
      expect(error.message).toBe('Expected valid ComponentType. Got: invalid. Valid types: API, UI')
    })

    it('sets name', () => {
      const error = new InvalidComponentTypeError('x', [])
      expect(error.name).toBe('InvalidComponentTypeError')
    })

    it('exposes value and validTypes', () => {
      const error = new InvalidComponentTypeError('bad', ['A', 'B'])
      expect(error.value).toBe('bad')
      expect(error.validTypes).toStrictEqual(['A', 'B'])
    })
  })

  describe('InvalidNormalizedComponentTypeError', () => {
    it('sets message with value and valid types', () => {
      const error = new InvalidNormalizedComponentTypeError('unknown', ['api', 'ui'])
      expect(error.message).toBe('Invalid component type: unknown. Valid types: api, ui')
    })

    it('sets name', () => {
      const error = new InvalidNormalizedComponentTypeError('x', [])
      expect(error.name).toBe('InvalidNormalizedComponentTypeError')
    })

    it('exposes value and validTypes', () => {
      const error = new InvalidNormalizedComponentTypeError('bad', ['a'])
      expect(error.value).toBe('bad')
      expect(error.validTypes).toStrictEqual(['a'])
    })
  })

  describe('ConfigSchemaValidationError', () => {
    it('sets message with source and details', () => {
      const error = new ConfigSchemaValidationError('config.yaml', 'missing field')
      expect(error.message).toBe("Invalid extended config in 'config.yaml': missing field")
    })

    it('sets name', () => {
      const error = new ConfigSchemaValidationError('src', 'details')
      expect(error.name).toBe('ConfigSchemaValidationError')
    })
  })

  describe('InvalidConfigFormatError', () => {
    it('sets message with source and preview', () => {
      const error = new InvalidConfigFormatError('config.yaml', '{"key": "value"}')
      expect(error.message).toBe(
        "Invalid extended config format in 'config.yaml'. " +
          'Expected object with \'modules\' array or top-level component rules. Got: {"key": "value"}',
      )
    })

    it('sets name', () => {
      const error = new InvalidConfigFormatError('src', 'preview')
      expect(error.name).toBe('InvalidConfigFormatError')
    })

    it('exposes source and preview', () => {
      const error = new InvalidConfigFormatError('my-source', 'my-preview')
      expect(error.source).toBe('my-source')
      expect(error.preview).toBe('my-preview')
    })
  })

  describe('PackageResolveError', () => {
    it('sets message with package name', () => {
      const error = new PackageResolveError('@org/package')
      expect(error.message).toBe(
        "Cannot resolve package '@org/package'. " +
          'Ensure the package is installed in node_modules.',
      )
    })

    it('sets name', () => {
      const error = new PackageResolveError('pkg')
      expect(error.name).toBe('PackageResolveError')
    })

    it('exposes packageName', () => {
      const error = new PackageResolveError('my-pkg')
      expect(error.packageName).toBe('my-pkg')
    })
  })

  describe('ConfigFileNotFoundError', () => {
    it('sets message with source and file path', () => {
      const error = new ConfigFileNotFoundError('./base.yaml', '/path/to/base.yaml')
      expect(error.message).toBe(
        "Cannot resolve extends reference './base.yaml'. File not found: /path/to/base.yaml",
      )
    })

    it('sets name', () => {
      const error = new ConfigFileNotFoundError('src', 'path')
      expect(error.name).toBe('ConfigFileNotFoundError')
    })

    it('exposes source and filePath', () => {
      const error = new ConfigFileNotFoundError('my-source', '/my/path')
      expect(error.source).toBe('my-source')
      expect(error.filePath).toBe('/my/path')
    })
  })

  describe('InternalSchemaValidationError', () => {
    it('sets message', () => {
      const error = new InternalSchemaValidationError()
      expect(error.message).toBe(
        'Config has empty modules array (schema validation should prevent this)',
      )
    })

    it('sets name', () => {
      const error = new InternalSchemaValidationError()
      expect(error.name).toBe('InternalSchemaValidationError')
    })
  })

  describe('ModuleRefNotFoundError', () => {
    it('sets message with ref and file path', () => {
      const error = new ModuleRefNotFoundError('./domains/orders.json', '/project/domains/orders.json')
      expect(error.message).toBe(
        "Cannot resolve module reference './domains/orders.json'. File not found: /project/domains/orders.json",
      )
    })

    it('sets name', () => {
      const error = new ModuleRefNotFoundError('./ref', '/path')
      expect(error.name).toBe('ModuleRefNotFoundError')
    })

    it('sets ref property', () => {
      const error = new ModuleRefNotFoundError('./domains/orders.json', '/project/domains/orders.json')
      expect(error.ref).toBe('./domains/orders.json')
    })

    it('sets filePath property', () => {
      const error = new ModuleRefNotFoundError('./domains/orders.json', '/project/domains/orders.json')
      expect(error.filePath).toBe('/project/domains/orders.json')
    })
  })
})
