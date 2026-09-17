/** Applies triggers.sql via the `postgres` driver instead of shelling out to `psql`, so the image doesn't need a postgresql-client install. */
import { readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';
import { config } from '../config';

async function main(): Promise<void> {
  const sql = postgres(config.databaseUrl);
  const triggersSql = readFileSync(join(import.meta.dir, 'triggers.sql'), 'utf-8');

  try {
    await sql.unsafe(triggersSql);
    console.log('[apply-triggers] applied successfully');
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error('[apply-triggers] failed:', err);
  process.exit(1);
});
