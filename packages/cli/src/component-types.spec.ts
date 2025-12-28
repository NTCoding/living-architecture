import { describe, it, expect } from 'vitest';
import {
  isValidComponentType,
  isValidLinkType,
  normalizeComponentType,
  VALID_COMPONENT_TYPES,
  VALID_LINK_TYPES,
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
      expect(() => normalizeComponentType('Invalid')).toThrow(/Invalid component type/);
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
