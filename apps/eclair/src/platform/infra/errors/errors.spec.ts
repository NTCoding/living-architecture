import {
  describe, it, expect 
} from 'vitest'
import {
  EclairError,
  GraphError,
  RenderingError,
  LayoutError,
  ContextError,
  CSSModuleError,
  DOMError,
  SchemaError,
} from './errors'

describe('errors', () => {
  describe('EclairError', () => {
    it('sets message', () => {
      const error = new EclairError('test message')
      expect(error.message).toBe('test message')
    })

    it('sets name', () => {
      const error = new EclairError('msg')
      expect(error.name).toBe('EclairError')
    })

    it('extends Error', () => {
      const error = new EclairError('msg')
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('GraphError', () => {
    it('sets message', () => {
      const error = new GraphError('graph not found')
      expect(error.message).toBe('graph not found')
    })

    it('sets name', () => {
      const error = new GraphError('msg')
      expect(error.name).toBe('GraphError')
    })

    it('extends EclairError', () => {
      const error = new GraphError('msg')
      expect(error).toBeInstanceOf(EclairError)
    })
  })

  describe('RenderingError', () => {
    it('sets message', () => {
      const error = new RenderingError('render failed')
      expect(error.message).toBe('render failed')
    })

    it('sets name', () => {
      const error = new RenderingError('msg')
      expect(error.name).toBe('RenderingError')
    })

    it('extends EclairError', () => {
      const error = new RenderingError('msg')
      expect(error).toBeInstanceOf(EclairError)
    })
  })

  describe('LayoutError', () => {
    it('sets message', () => {
      const error = new LayoutError('layout computation failed')
      expect(error.message).toBe('layout computation failed')
    })

    it('sets name', () => {
      const error = new LayoutError('msg')
      expect(error.name).toBe('LayoutError')
    })

    it('extends EclairError', () => {
      const error = new LayoutError('msg')
      expect(error).toBeInstanceOf(EclairError)
    })
  })

  describe('ContextError', () => {
    it('sets message with hook and provider names', () => {
      const error = new ContextError('useTheme', 'ThemeProvider')
      expect(error.message).toBe('useTheme must be used within a ThemeProvider')
    })

    it('sets name', () => {
      const error = new ContextError('hook', 'provider')
      expect(error.name).toBe('ContextError')
    })

    it('extends EclairError', () => {
      const error = new ContextError('hook', 'provider')
      expect(error).toBeInstanceOf(EclairError)
    })
  })

  describe('CSSModuleError', () => {
    it('sets message with class and module names', () => {
      const error = new CSSModuleError('container', 'styles.module.css')
      expect(error.message).toBe('CSS module class "container" not found in styles.module.css')
    })

    it('sets name', () => {
      const error = new CSSModuleError('class', 'module')
      expect(error.name).toBe('CSSModuleError')
    })

    it('extends EclairError', () => {
      const error = new CSSModuleError('class', 'module')
      expect(error).toBeInstanceOf(EclairError)
    })
  })

  describe('DOMError', () => {
    it('sets message', () => {
      const error = new DOMError('element not found')
      expect(error.message).toBe('element not found')
    })

    it('sets name', () => {
      const error = new DOMError('msg')
      expect(error.name).toBe('DOMError')
    })

    it('extends EclairError', () => {
      const error = new DOMError('msg')
      expect(error).toBeInstanceOf(EclairError)
    })
  })

  describe('SchemaError', () => {
    it('sets message', () => {
      const error = new SchemaError('schema validation failed')
      expect(error.message).toBe('schema validation failed')
    })

    it('sets name', () => {
      const error = new SchemaError('msg')
      expect(error.name).toBe('SchemaError')
    })

    it('extends EclairError', () => {
      const error = new SchemaError('msg')
      expect(error).toBeInstanceOf(EclairError)
    })
  })
})
