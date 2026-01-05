import {
  describe, it, expect 
} from 'vitest';
import {
  ComponentNotFoundError,
  CustomTypeNotFoundError,
  DomainNotFoundError,
  DuplicateComponentError,
  DuplicateDomainError,
} from './errors';

describe('errors', () => {
  describe('DuplicateDomainError', () => {
    it('includes domain name in message', () => {
      const error = new DuplicateDomainError('orders');

      expect(error.message).toBe("Domain 'orders' already exists");
      expect(error.domainName).toBe('orders');
      expect(error.name).toBe('DuplicateDomainError');
    });
  });

  describe('DomainNotFoundError', () => {
    it('includes domain name in message', () => {
      const error = new DomainNotFoundError('orders');

      expect(error.message).toBe("Domain 'orders' does not exist");
      expect(error.domainName).toBe('orders');
      expect(error.name).toBe('DomainNotFoundError');
    });
  });

  describe('CustomTypeNotFoundError', () => {
    it('includes custom type name and defined types in message', () => {
      const error = new CustomTypeNotFoundError('Queue', ['Worker', 'Cache']);

      expect(error.message).toBe(
        "Custom type 'Queue' not defined. Defined types: Worker, Cache",
      );
      expect(error.customTypeName).toBe('Queue');
      expect(error.definedTypes).toEqual(['Worker', 'Cache']);
      expect(error.name).toBe('CustomTypeNotFoundError');
    });

    it('handles empty defined types', () => {
      const error = new CustomTypeNotFoundError('Queue', []);

      expect(error.message).toBe(
        "Custom type 'Queue' not defined. No custom types have been defined.",
      );
    });
  });

  describe('DuplicateComponentError', () => {
    it('includes component ID in message', () => {
      const error = new DuplicateComponentError(
        'orders:checkout:api:create-order',
      );

      expect(error.message).toBe(
        "Component with ID 'orders:checkout:api:create-order' already exists",
      );
      expect(error.componentId).toBe('orders:checkout:api:create-order');
      expect(error.name).toBe('DuplicateComponentError');
    });
  });

  describe('ComponentNotFoundError', () => {
    it('includes component ID and empty suggestions by default', () => {
      const error = new ComponentNotFoundError(
        'orders:checkout:api:create-ordr',
      );

      expect(error.message).toBe(
        "Source component 'orders:checkout:api:create-ordr' not found",
      );
      expect(error.componentId).toBe('orders:checkout:api:create-ordr');
      expect(error.suggestions).toEqual([]);
      expect(error.name).toBe('ComponentNotFoundError');
    });

    it('includes suggestions in message when provided', () => {
      const error = new ComponentNotFoundError(
        'orders:checkout:api:create-ordr',
        [
          'orders:checkout:api:create-order',
          'orders:checkout:api:update-order',
        ],
      );

      expect(error.message).toBe(
        "Source component 'orders:checkout:api:create-ordr' not found. Did you mean: orders:checkout:api:create-order, orders:checkout:api:update-order?",
      );
      expect(error.suggestions).toEqual([
        'orders:checkout:api:create-order',
        'orders:checkout:api:update-order',
      ]);
    });
  });
});
