import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { resolveGraphPath, getDefaultGraphPathDescription } from './graph-path';

describe('resolveGraphPath', () => {
  const testContext: { originalCwd: string } = { originalCwd: '' };

  beforeEach(() => {
    testContext.originalCwd = process.cwd();
  });

  afterEach(() => {
    process.chdir(testContext.originalCwd);
  });

  it('returns custom path when provided', () => {
    const customPath = '/custom/path/graph.json';

    const result = resolveGraphPath(customPath);

    expect(result).toBe(customPath);
  });

  it('returns default path when no custom path provided', () => {
    const result = resolveGraphPath();

    expect(result).toBe(join(process.cwd(), '.riviere/graph.json'));
  });
});

describe('getDefaultGraphPathDescription', () => {
  it('returns description with default path', () => {
    const result = getDefaultGraphPathDescription();

    expect(result).toBe('Custom graph file path (default: .riviere/graph.json)');
  });
});
