import {
  describe, it, expect, beforeEach, afterEach, vi 
} from 'vitest';
import {
  mkdtemp, rm, writeFile 
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('fileExists', () => {
  const testContext: { testDir: string } = { testDir: '' };

  beforeEach(async () => {
    testContext.testDir = await mkdtemp(join(tmpdir(), 'file-existence-test-'));
    vi.resetModules();
  });

  afterEach(async () => {
    await rm(testContext.testDir, { recursive: true });
    vi.restoreAllMocks();
  });

  it('returns true when file exists', async () => {
    const { fileExists } = await import('./file-existence');
    const filePath = join(testContext.testDir, 'existing-file.txt');
    await writeFile(filePath, 'content', 'utf-8');

    const result = await fileExists(filePath);

    expect(result).toBe(true);
  });

  it('returns false when file does not exist', async () => {
    const { fileExists } = await import('./file-existence');
    const filePath = join(testContext.testDir, 'nonexistent-file.txt');

    const result = await fileExists(filePath);

    expect(result).toBe(false);
  });

  it('rethrows non-ENOENT errors', async () => {
    const permissionError = new Error('Permission denied');
    Object.assign(permissionError, { code: 'EACCES' });

    vi.doMock('node:fs/promises', () => ({access: vi.fn().mockRejectedValue(permissionError),}));

    const { fileExists } = await import('./file-existence');

    await expect(fileExists('/some/path')).rejects.toThrow('Permission denied');
  });
});
