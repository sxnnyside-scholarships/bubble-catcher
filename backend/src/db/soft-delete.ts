import { isNull, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

/** Compose with `.where()` to exclude soft-deleted rows: `and(notDeleted(table.deletedAt), eq(...))` */
export function notDeleted(deletedAtColumn: PgColumn): SQL {
  return isNull(deletedAtColumn);
}

/** Value to set on `deletedAt` when soft-deleting a row via `.update({ deletedAt: softDeleteNow() })` */
export function softDeleteNow(): Date {
  return new Date();
}
