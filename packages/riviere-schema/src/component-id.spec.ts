import { ComponentId } from './component-id';

describe('ComponentId', () => {
  describe('create', () => {
    it('creates ID from parts with correct format', () => {
      const id = ComponentId.create({
        domain: 'orders',
        module: 'checkout',
        type: 'domainop',
        name: 'Place Order',
      });

      expect(id.toString()).toBe('orders:checkout:domainop:place-order');
    });

    it('lowercases and hyphenates name', () => {
      const id = ComponentId.create({
        domain: 'orders',
        module: 'checkout',
        type: 'usecase',
        name: 'Handle Customer Request',
      });

      expect(id.toString()).toBe('orders:checkout:usecase:handle-customer-request');
    });

    it('exposes name segment', () => {
      const id = ComponentId.create({
        domain: 'orders',
        module: 'checkout',
        type: 'domainop',
        name: 'Place Order',
      });

      expect(id.name()).toBe('place-order');
    });
  });

  describe('parse', () => {
    it('parses valid ID string', () => {
      const id = ComponentId.parse('orders:checkout:domainop:place-order');

      expect(id.name()).toBe('place-order');
      expect(id.toString()).toBe('orders:checkout:domainop:place-order');
    });

    it('throws on invalid format with too few segments', () => {
      expect(() => ComponentId.parse('orders:checkout')).toThrow(
        "Invalid component ID format: 'orders:checkout'. Expected 'domain:module:type:name'",
      );
    });

    it('throws on invalid format with too many segments', () => {
      expect(() => ComponentId.parse('orders:checkout:domainop:place:order')).toThrow(
        "Invalid component ID format: 'orders:checkout:domainop:place:order'. Expected 'domain:module:type:name'",
      );
    });

    it('throws on empty string', () => {
      expect(() => ComponentId.parse('')).toThrow(
        "Invalid component ID format: ''. Expected 'domain:module:type:name'",
      );
    });
  });
});
