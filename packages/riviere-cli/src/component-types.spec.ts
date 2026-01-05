import {
  describe, it, expect 
} from 'vitest';
import {
  isValidComponentType,
  isValidLinkType,
  isValidApiType,
  isValidSystemType,
  normalizeComponentType,
  normalizeToSchemaComponentType,
  VALID_COMPONENT_TYPES,
  VALID_LINK_TYPES,
  VALID_API_TYPES,
  VALID_SYSTEM_TYPES,
} from './component-types';

describe('component-types', () => {
  describe('VALID_COMPONENT_TYPES', () => {
    it('contains all expected component types', () => {
      expect(VALID_COMPONENT_TYPES).toEqual([
        'UI',
        'API',
        'UseCase',
        'DomainOp',
        'Event',
        'EventHandler',
        'Custom',
      ]);
    });
  });

  describe('isValidComponentType', () => {
    it.each(VALID_COMPONENT_TYPES)('accepts %s as valid', (type) => {
      expect(isValidComponentType(type)).toBe(true);
    });

    it.each(VALID_COMPONENT_TYPES)('accepts lowercase %s as valid', (type) => {
      expect(isValidComponentType(type.toLowerCase())).toBe(true);
    });

    it('rejects invalid component types', () => {
      expect(isValidComponentType('Invalid')).toBe(false);
      expect(isValidComponentType('unknown')).toBe(false);
      expect(isValidComponentType('')).toBe(false);
    });
  });

  describe('normalizeComponentType', () => {
    it.each([
      ['UI', 'ui'],
      ['ui', 'ui'],
      ['API', 'api'],
      ['UseCase', 'usecase'],
      ['USECASE', 'usecase'],
      ['DomainOp', 'domainop'],
      ['Event', 'event'],
      ['EventHandler', 'eventhandler'],
      ['Custom', 'custom'],
    ])('normalizes %s to %s', (input, expected) => {
      expect(normalizeComponentType(input)).toBe(expected);
    });

    it('throws for invalid component type', () => {
      expect(() => normalizeComponentType('Invalid')).toThrow(
        /Invalid component type/,
      );
    });
  });

  describe('normalizeToSchemaComponentType', () => {
    it.each([
      ['UI', 'UI'],
      ['ui', 'UI'],
      ['API', 'API'],
      ['api', 'API'],
      ['UseCase', 'UseCase'],
      ['usecase', 'UseCase'],
      ['DomainOp', 'DomainOp'],
      ['domainop', 'DomainOp'],
      ['Event', 'Event'],
      ['EventHandler', 'EventHandler'],
      ['Custom', 'Custom'],
    ])('normalizes %s to schema type %s', (input, expected) => {
      expect(normalizeToSchemaComponentType(input)).toBe(expected);
    });

    it('throws for invalid component type', () => {
      expect(() => normalizeToSchemaComponentType('InvalidType')).toThrow(
        /Expected valid ComponentType/,
      );
    });
  });

  describe('VALID_SYSTEM_TYPES', () => {
    it('contains domain, bff, ui, and other', () => {
      expect(VALID_SYSTEM_TYPES).toEqual(['domain', 'bff', 'ui', 'other']);
    });
  });

  describe('isValidSystemType', () => {
    it.each(VALID_SYSTEM_TYPES)('accepts %s as valid', (type) => {
      expect(isValidSystemType(type)).toBe(true);
    });

    it('rejects invalid system types', () => {
      expect(isValidSystemType('backend')).toBe(false);
      expect(isValidSystemType('DOMAIN')).toBe(false);
      expect(isValidSystemType('')).toBe(false);
    });
  });

  describe('VALID_API_TYPES', () => {
    it('contains REST, GraphQL, and other', () => {
      expect(VALID_API_TYPES).toEqual(['REST', 'GraphQL', 'other']);
    });
  });

  describe('isValidApiType', () => {
    it.each(VALID_API_TYPES)('accepts %s as valid', (type) => {
      expect(isValidApiType(type)).toBe(true);
    });

    it.each(VALID_API_TYPES)('accepts case variations of %s', (type) => {
      expect(isValidApiType(type.toLowerCase())).toBe(true);
      expect(isValidApiType(type.toUpperCase())).toBe(true);
    });

    it('rejects invalid API types', () => {
      expect(isValidApiType('SOAP')).toBe(false);
      expect(isValidApiType('')).toBe(false);
    });
  });

  describe('VALID_LINK_TYPES', () => {
    it('contains sync and async', () => {
      expect(VALID_LINK_TYPES).toEqual(['sync', 'async']);
    });
  });

  describe('isValidLinkType', () => {
    it('accepts sync as valid', () => {
      expect(isValidLinkType('sync')).toBe(true);
    });

    it('accepts async as valid', () => {
      expect(isValidLinkType('async')).toBe(true);
    });

    it('rejects invalid link types', () => {
      expect(isValidLinkType('synchronous')).toBe(false);
      expect(isValidLinkType('SYNC')).toBe(false);
      expect(isValidLinkType('')).toBe(false);
    });
  });
});
