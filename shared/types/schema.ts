/** User-facing column types — mapped to a real dialect-specific SQL type server-side (see schema.service.ts). */
export const COLUMN_TYPES = ['text', 'integer', 'decimal', 'boolean', 'date', 'datetime'] as const;
export type ColumnType = (typeof COLUMN_TYPES)[number];

export interface TableColumn {
  name: string;
  type: ColumnType;
  primaryKey: boolean;
  nullable: boolean;
  /** Set when this column references another table's column (rendered as a relationship in the Sandbox diagram). */
  references: { table: string; column: string } | null;
}

export interface TableSchema {
  name: string;
  columns: TableColumn[];
}

export interface ProjectSchema {
  tables: TableSchema[];
}

export interface CreateTablePayload {
  name: string;
  columns: TableColumn[];
}

export interface SeedTablePayload {
  count: number;
}

export interface SeedTableResult {
  inserted: number;
}
