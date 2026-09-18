/** Generic column types supported across sandbox database engines. */
export const COLUMN_TYPES = ['text', 'integer', 'decimal', 'boolean', 'date', 'datetime'] as const;
export type ColumnType = (typeof COLUMN_TYPES)[number];

export interface TableColumn {
  name: string;
  type: ColumnType;
  primaryKey: boolean;
  nullable: boolean;
  /** Foreign key relationship target if applicable. */
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
