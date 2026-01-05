import {
  describe, it, expect 
} from 'vitest';
import { RiviereBuilder } from './builder';

function createBuilderWithComponents(): RiviereBuilder {
  const builder = RiviereBuilder.new({
    sources: [{
      repository: 'test/repo',
      commit: 'abc123' 
    }],
    domains: {
      orders: {
        description: 'Order domain',
        systemType: 'domain' 
      },
      shipping: {
        description: 'Shipping domain',
        systemType: 'domain' 
      },
    },
  });

  builder.addUseCase({
    name: 'OrderService',
    domain: 'orders',
    module: 'core',
    sourceLocation: {
      repository: 'test/repo',
      filePath: 'src/order.ts',
      lineNumber: 1,
    },
  });

  builder.addUseCase({
    name: 'PaymentService',
    domain: 'orders',
    module: 'core',
    sourceLocation: {
      repository: 'test/repo',
      filePath: 'src/payment.ts',
      lineNumber: 1,
    },
  });

  builder.addEvent({
    name: 'OrderPlaced',
    domain: 'orders',
    module: 'events',
    eventName: 'OrderPlaced',
    sourceLocation: {
      repository: 'test/repo',
      filePath: 'src/events.ts',
      lineNumber: 1,
    },
  });

  builder.addUseCase({
    name: 'ShippingService',
    domain: 'shipping',
    module: 'core',
    sourceLocation: {
      repository: 'test/repo',
      filePath: 'src/shipping.ts',
      lineNumber: 1,
    },
  });

  return builder;
}

function firstResult<T>(results: T[]): T {
  const first = results[0];
  if (first === undefined) throw new Error('Expected at least one result');
  return first;
}

describe('RiviereBuilder.nearMatches', () => {
  describe('same name, wrong type (most common mistake)', () => {
    it('exact name with wrong type returns match with type mismatch', () => {
      const builder = createBuilderWithComponents();
      const query = {
        name: 'OrderPlaced',
        type: 'UseCase' as const 
      };
      const results = builder.nearMatches(query);

      expect(results.length).toBeGreaterThan(0);
      const first = firstResult(results);
      expect(first.component.name).toBe('OrderPlaced');
      expect(first.component.type).toBe('Event');
      expect(first.mismatch).toEqual({
        field: 'type',
        expected: 'UseCase',
        actual: 'Event',
      });
    });

    it('UseCase found when Event expected', () => {
      const builder = createBuilderWithComponents();
      const query = {
        name: 'OrderService',
        type: 'Event' as const 
      };
      const results = builder.nearMatches(query);

      expect(results.length).toBeGreaterThan(0);
      const first = firstResult(results);
      expect(first.component.name).toBe('OrderService');
      expect(first.component.type).toBe('UseCase');
      expect(first.mismatch).toEqual({
        field: 'type',
        expected: 'Event',
        actual: 'UseCase',
      });
    });
  });

  describe('same name, wrong domain (common mistake)', () => {
    it.each([
      [
        {
          name: 'OrderService',
          domain: 'shipping' 
        },
        {
          expectedName: 'OrderService',
          expectedDomain: 'orders',
          mismatchField: 'domain',
        },
        'exact name with wrong domain returns match with domain mismatch',
      ],
    ])('nearMatches(%o) - %s', (query, expected) => {
      const builder = createBuilderWithComponents();
      const results = builder.nearMatches(query);

      expect(results.length).toBeGreaterThan(0);
      const first = firstResult(results);
      expect(first.component.name).toBe(expected.expectedName);
      expect(first.component.domain).toBe(expected.expectedDomain);
      expect(first.mismatch).toEqual({
        field: expected.mismatchField,
        expected: query.domain,
        actual: expected.expectedDomain,
      });
    });
  });

  describe('name typos', () => {
    it.each([
      [{ name: 'OrdrService' }, 'OrderService', 'single typo finds match'],
      [{ name: 'OrderServce' }, 'OrderService', 'missing char finds match'],
      [
        { name: 'OrderSerivce' },
        'OrderService',
        'transposed chars finds match',
      ],
      [
        { name: 'Paymentservice' },
        'PaymentService',
        'case difference finds match',
      ],
    ])('nearMatches(%o) finds "%s" - %s', (query, expectedName) => {
      const builder = createBuilderWithComponents();
      const results = builder.nearMatches(query);

      expect(results.length).toBeGreaterThan(0);
      const first = firstResult(results);
      expect(first.component.name).toBe(expectedName);
      expect(first.mismatch).toBeUndefined();
    });
  });

  describe('no matches', () => {
    it.each([
      [{ name: 'XYZ123' }, 'completely different returns empty'],
      [{ name: 'Foo' }, 'short unrelated returns empty'],
      [{ name: '' }, 'empty name returns empty'],
    ])('nearMatches(%o) returns [] - %s', (query) => {
      const builder = createBuilderWithComponents();
      const results = builder.nearMatches(query);

      expect(results).toEqual([]);
    });
  });

  describe('multiple matches sorted by score', () => {
    it('returns multiple results sorted by score descending', () => {
      const builder = createBuilderWithComponents();
      const results = builder.nearMatches(
        { name: 'Service' },
        { threshold: 0.3 },
      );

      expect(results.length).toBe(4);
      expect(results.map((r) => r.component.name)).toEqual([
        'OrderService',
        'PaymentService',
        'ShippingService',
        'OrderPlaced',
      ]);
    });

    it('returns exact match first, then by similarity', () => {
      const builder = createBuilderWithComponents();
      const results = builder.nearMatches({ name: 'OrderServic' });

      expect(results.length).toBeGreaterThan(0);
      const first = firstResult(results);
      expect(first.component.name).toBe('OrderService');
      // Name doesn't match exactly, no mismatch detected
      expect(first.mismatch).toBeUndefined();
    });

    it('exact name match has score 1.0', () => {
      const builder = createBuilderWithComponents();
      const results = builder.nearMatches({ name: 'OrderService' });

      const first = firstResult(results);
      expect(first.component.name).toBe('OrderService');
      expect(first.score).toBe(1.0);
    });
  });

  describe('options', () => {
    it('respects threshold option', () => {
      const builder = createBuilderWithComponents();
      // Very high threshold should exclude partial matches
      const results = builder.nearMatches(
        { name: 'OrderServic' },
        { threshold: 0.99 },
      );

      expect(results).toEqual([]);
    });

    it('respects limit option', () => {
      const builder = createBuilderWithComponents();
      // Lower threshold to get multiple matches, then limit to 1
      const results = builder.nearMatches(
        { name: 'OrderService' },
        { limit: 1 },
      );

      expect(results.length).toBe(1);
    });
  });
});
