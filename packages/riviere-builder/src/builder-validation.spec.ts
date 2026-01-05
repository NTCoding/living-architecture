import {
 describe, it, expect 
} from 'vitest';
import { RiviereBuilder } from './builder';
import {
  createValidOptions,
  createSourceLocation,
} from './builder-test-fixtures';

describe('RiviereBuilder', () => {
  describe('validate', () => {
    it('returns valid=true when graph has no issues', () => {
      const builder = RiviereBuilder.new(createValidOptions());

      const source = builder.addUseCase({
        name: 'Create Order',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: createSourceLocation(),
      });

      const target = builder.addDomainOp({
        name: 'Save Order',
        domain: 'orders',
        module: 'checkout',
        operationName: 'saveOrder',
        sourceLocation: createSourceLocation(),
      });

      builder.link({
 from: source.id,
to: target.id 
});

      const result = builder.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns INVALID_LINK_TARGET error when link references non-existent target', () => {
      const builder = RiviereBuilder.new(createValidOptions());

      const source = builder.addUseCase({
        name: 'Create Order',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: createSourceLocation(),
      });

      builder.link({
 from: source.id,
to: 'nonexistent:target:id' 
});

      const result = builder.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        code: 'INVALID_LINK_TARGET',
        path: '/links/0/target',
      });
    });

    it('returns multiple errors when graph has multiple issues', () => {
      const builder = RiviereBuilder.new(createValidOptions());

      const source = builder.addUseCase({
        name: 'Create Order',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: createSourceLocation(),
      });

      builder.link({
 from: source.id,
to: 'bad:target:one' 
});
      builder.link({
 from: source.id,
to: 'bad:target:two' 
});

      const result = builder.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    it('returns valid=true when graph has no components or links', () => {
      const builder = RiviereBuilder.new(createValidOptions());

      const result = builder.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns valid=true when graph has custom types defined', () => {
      const builder = RiviereBuilder.new(createValidOptions());

      builder.defineCustomType({
        name: 'Database',
        description: 'Database component',
      });

      const source = builder.addCustom({
        customTypeName: 'Database',
        name: 'OrderDB',
        domain: 'orders',
        module: 'persistence',
        sourceLocation: createSourceLocation(),
      });

      const target = builder.addDomainOp({
        name: 'Save Order',
        domain: 'orders',
        module: 'checkout',
        operationName: 'saveOrder',
        sourceLocation: createSourceLocation(),
      });

      builder.link({
 from: source.id,
to: target.id 
});

      const result = builder.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns valid=true when graph has external links', () => {
      const builder = RiviereBuilder.new(createValidOptions());

      const source = builder.addUseCase({
        name: 'Payment Service',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: createSourceLocation(),
      });

      builder.linkExternal({
        from: source.id,
        target: { name: 'Stripe API' },
      });

      const result = builder.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });
});
