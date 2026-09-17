import { describe, expect, it } from 'bun:test';
import type { CreatePlaygroundSharePayload, PlaygroundShare } from '@shared/types';

describe('PlaygroundShare Contract', () => {
  it('validates share payload structure with optional notes and schema statements', () => {
    const payload: CreatePlaygroundSharePayload = {
      title: 'Lab 1 Query Question',
      notes: 'Why does this query take 400ms without index?',
      sql: 'SELECT * FROM products WHERE price > 50;',
      dialect: 'postgresql',
      projectId: 'proj-123',
    };

    expect(payload.title).toBe('Lab 1 Query Question');
    expect(payload.dialect).toBe('postgresql');
    expect(payload.notes).toBeDefined();
  });

  it('validates PlaygroundShare output structure', () => {
    const share: PlaygroundShare = {
      id: 'share-abc-123',
      authorId: 'user-1',
      authorName: 'Ana Perez',
      title: 'Sales Aggregation',
      notes: 'Need feedback on GROUP BY',
      sql: 'SELECT region, SUM(amount) FROM sales GROUP BY region;',
      dialect: 'mysql',
      schemaStatements: [{ tableName: 'sales', kind: 'create', sql: 'CREATE TABLE sales (region text, amount int);' }],
      schemaTables: [],
      createdAt: new Date().toISOString(),
    };

    expect(share.id).toBe('share-abc-123');
    expect(share.authorName).toBe('Ana Perez');
    expect(share.schemaStatements.length).toBe(1);
    expect(share.dialect).toBe('mysql');
  });
});
