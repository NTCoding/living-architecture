import {
  describe, it, expect, afterEach 
} from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RiviereBuilder } from './builder';
import {
  createValidOptions,
  createSourceLocation,
} from './builder-test-fixtures';

describe('RiviereBuilder', () => {
  describe('build', () => {
    it('returns RiviereGraph with correct structure when valid', () => {
      const builder = RiviereBuilder.new({
        ...createValidOptions(),
        name: 'test-graph',
        description: 'A test graph',
      });

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

      const graph = builder.build();

      expect(graph.version).toBe('1.0');
      expect(graph.metadata.name).toBe('test-graph');
      expect(graph.metadata.description).toBe('A test graph');
      expect(graph.metadata.sources).toEqual([
        {
          repository: 'test/repo',
          commit: 'abc123' 
        },
      ]);
      expect(graph.metadata.domains).toEqual({
        orders: {
          description: 'Order domain',
          systemType: 'domain' 
        },
        shipping: {
          description: 'Shipping domain',
          systemType: 'domain' 
        },
      });
      expect(graph.components).toContainEqual(
        expect.objectContaining({
          id: source.id,
          name: 'Create Order',
          type: 'UseCase',
        }),
      );
      expect(graph.components).toContainEqual(
        expect.objectContaining({
          id: target.id,
          name: 'Save Order',
          type: 'DomainOp',
        }),
      );
      expect(graph.links).toContainEqual({
        source: source.id,
        target: target.id,
      });
    });

    it('throws with validation error when link target does not exist', () => {
      const builder = RiviereBuilder.new(createValidOptions());

      const source = builder.addUseCase({
        name: 'Create Order',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: createSourceLocation(),
      });

      builder.link({
        from: source.id,
        to: 'nonexistent:component:id' 
      });

      expect(() => builder.build()).toThrow(/validation failed/i);
    });

    it('succeeds with orphan components (orphans are warnings, not errors)', () => {
      const builder = RiviereBuilder.new(createValidOptions());

      builder.addUseCase({
        name: 'Orphan Service',
        domain: 'orders',
        module: 'core',
        sourceLocation: createSourceLocation(),
      });

      const graph = builder.build();

      expect(graph.components).toHaveLength(1);
      expect(
        builder.warnings().some((w) => w.code === 'ORPHAN_COMPONENT'),
      ).toBe(true);
    });

    it('excludes customTypes when none defined', () => {
      const builder = RiviereBuilder.new(createValidOptions());

      const graph = builder.build();

      expect(graph.metadata.customTypes).toBeUndefined();
    });

    it('includes customTypes when defined', () => {
      const builder = RiviereBuilder.new(createValidOptions());

      builder.defineCustomType({
        name: 'Repository',
        requiredProperties: {
          entityName: {
            type: 'string',
            description: 'Entity managed by this repository',
          },
        },
      });

      const graph = builder.build();

      expect(graph.metadata.customTypes).toEqual({
        Repository: {
          requiredProperties: {
            entityName: {
              type: 'string',
              description: 'Entity managed by this repository',
            },
          },
        },
      });
    });

    it('excludes externalLinks when none present', () => {
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

      const graph = builder.build();

      expect(graph.externalLinks).toBeUndefined();
    });

    it('includes externalLinks when present', () => {
      const builder = RiviereBuilder.new(createValidOptions());

      const source = builder.addUseCase({
        name: 'Payment Service',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: createSourceLocation(),
      });

      builder.linkExternal({
        from: source.id,
        target: { name: 'Stripe API' } 
      });

      const graph = builder.build();

      expect(graph.externalLinks).toEqual([
        {
          source: source.id,
          target: { name: 'Stripe API' } 
        },
      ]);
    });
  });

  describe('save', () => {
    const tempFiles: string[] = [];

    afterEach(async () => {
      for (const file of tempFiles) {
        await fs.unlink(file).catch(() => undefined);
      }
      tempFiles.length = 0;
    });

    it('writes formatted JSON to file', async () => {
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

      const filePath = join(tmpdir(), `riviere-test-${Date.now()}.json`);
      tempFiles.push(filePath);

      await builder.save(filePath);

      const content = await fs.readFile(filePath, 'utf-8');

      expect(content).toContain('"version": "1.0"');
      expect(content).toContain('"name": "Create Order"');
      expect(content).toContain('  "version"');
    });

    it('throws without writing when validation fails', async () => {
      const builder = RiviereBuilder.new(createValidOptions());

      const source = builder.addUseCase({
        name: 'Create Order',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: createSourceLocation(),
      });

      builder.link({
        from: source.id,
        to: 'nonexistent:component:id' 
      });

      const filePath = join(
        tmpdir(),
        `riviere-test-invalid-${Date.now()}.json`,
      );
      tempFiles.push(filePath);

      await expect(builder.save(filePath)).rejects.toThrow(
        /validation failed/i,
      );
      await expect(fs.access(filePath)).rejects.toThrow();
    });

    it('throws when directory does not exist', async () => {
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

      const filePath = '/nonexistent-directory-xyz/output.json';

      await expect(builder.save(filePath)).rejects.toThrow(
        /directory does not exist/i,
      );
    });
  });
});
