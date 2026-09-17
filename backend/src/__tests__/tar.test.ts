import { describe, expect, test } from 'bun:test';
import { buildSingleFileTar } from '../sandbox/tar';

describe('buildSingleFileTar', () => {
  test('embeds the filename in the header', () => {
    const tar = buildSingleFileTar('query.sql', 'SELECT 1;');
    expect(tar.subarray(0, 9).toString('utf-8')).toBe('query.sql');
  });

  test('is padded to a multiple of 512 bytes (USTAR block size)', () => {
    const tar = buildSingleFileTar('query.sql', 'SELECT 1;');
    expect(tar.length % 512).toBe(0);
  });

  test('embeds the exact content bytes', () => {
    const content = 'SELECT * FROM users WHERE id = 1;';
    const tar = buildSingleFileTar('query.sql', content);
    expect(tar.toString('utf-8')).toContain(content);
  });

  test('handles content with special shell characters without corrupting the archive size', () => {
    const content = "SELECT '__END_SQL__'; -- $(rm -rf /) `evil`";
    const tar = buildSingleFileTar('query.sql', content);
    expect(tar.length % 512).toBe(0);
    expect(tar.toString('utf-8')).toContain(content);
  });
});
