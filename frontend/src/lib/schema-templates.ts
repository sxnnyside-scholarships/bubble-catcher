import type { CreateTablePayload, TableColumn } from '@shared/types';

/** Ready-made multi-table schemas with realistic FK relationships — lets a user build a "complete"
 * database in one action instead of adding tables one at a time. Row generation reuses the same
 * per-table seed endpoint the Sandbox already exposes. */
export interface SchemaTemplate {
  id: string;
  labelKey: string;
  tables: CreateTablePayload[];
}

function col(partial: Partial<TableColumn> & Pick<TableColumn, 'name' | 'type'>): TableColumn {
  return { primaryKey: false, nullable: true, references: null, ...partial };
}

function idColumn(): TableColumn {
  return col({ name: 'id', type: 'integer', primaryKey: true, nullable: false });
}

export const SCHEMA_TEMPLATES: SchemaTemplate[] = [
  {
    id: 'blog',
    labelKey: 'sandbox.templateBlog',
    tables: [
      {
        name: 'authors',
        columns: [
          idColumn(),
          col({ name: 'name', type: 'text', nullable: false }),
          col({ name: 'email', type: 'text' }),
        ],
      },
      {
        name: 'posts',
        columns: [
          idColumn(),
          col({ name: 'title', type: 'text', nullable: false }),
          col({ name: 'description', type: 'text' }),
          col({ name: 'author_id', type: 'integer', references: { table: 'authors', column: 'id' } }),
        ],
      },
      {
        name: 'comments',
        columns: [
          idColumn(),
          col({ name: 'name', type: 'text' }),
          col({ name: 'description', type: 'text' }),
          col({ name: 'post_id', type: 'integer', references: { table: 'posts', column: 'id' } }),
        ],
      },
    ],
  },
  {
    id: 'ecommerce',
    labelKey: 'sandbox.templateEcommerce',
    tables: [
      {
        name: 'customers',
        columns: [
          idColumn(),
          col({ name: 'name', type: 'text', nullable: false }),
          col({ name: 'email', type: 'text' }),
        ],
      },
      {
        name: 'products',
        columns: [
          idColumn(),
          col({ name: 'product', type: 'text', nullable: false }),
          col({ name: 'price', type: 'decimal' }),
        ],
      },
      {
        name: 'orders',
        columns: [
          idColumn(),
          col({ name: 'customer_id', type: 'integer', references: { table: 'customers', column: 'id' } }),
          col({ name: 'created_at', type: 'date' }),
        ],
      },
      {
        name: 'order_items',
        columns: [
          idColumn(),
          col({ name: 'order_id', type: 'integer', references: { table: 'orders', column: 'id' } }),
          col({ name: 'product_id', type: 'integer', references: { table: 'products', column: 'id' } }),
          col({ name: 'quantity', type: 'integer' }),
        ],
      },
    ],
  },
  {
    id: 'school',
    labelKey: 'sandbox.templateSchool',
    tables: [
      {
        name: 'students',
        columns: [
          idColumn(),
          col({ name: 'name', type: 'text', nullable: false }),
          col({ name: 'email', type: 'text' }),
        ],
      },
      {
        name: 'courses',
        columns: [
          idColumn(),
          col({ name: 'title', type: 'text', nullable: false }),
          col({ name: 'description', type: 'text' }),
        ],
      },
      {
        name: 'enrollments',
        columns: [
          idColumn(),
          col({ name: 'student_id', type: 'integer', references: { table: 'students', column: 'id' } }),
          col({ name: 'course_id', type: 'integer', references: { table: 'courses', column: 'id' } }),
          col({ name: 'price', type: 'decimal' }),
        ],
      },
    ],
  },
];
