import { createClient } from '@libsql/client';
import { existsSync, readFileSync } from 'fs';

/* The executor overwrites /tmp/seed.sql per project (see docker-executor.ts); an empty project has an
 * empty file there, never the baked-in /app/seed.sql demo fixture. */
const seedPath = existsSync('/tmp/seed.sql') ? '/tmp/seed.sql' : '/app/seed.sql';
const seed = readFileSync(seedPath, 'utf-8').trim();

const db = createClient({ url: ':memory:' });
if (seed) await db.executeMultiple(seed);

const sql = readFileSync('/tmp/query.sql', 'utf-8');
const result = await db.execute(sql);

console.log(result.columns.join('\t'));
for (const row of result.rows) {
  console.log(result.columns.map((c) => String(row[c] ?? '')).join('\t'));
}
