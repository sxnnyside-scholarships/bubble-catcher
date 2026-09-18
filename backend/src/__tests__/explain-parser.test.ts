import { describe, expect, it } from 'bun:test';
import { explainParserService } from '../services/explain-parser.service';

describe('ExplainParserService', () => {
  it('parses PostgreSQL JSON explain plans with nested joins and buffer stats', () => {
    const pgPlan = JSON.stringify([
      {
        Plan: {
          'Node Type': 'Hash Join',
          'Startup Cost': 12.5,
          'Total Cost': 45.8,
          'Plan Rows': 50,
          'Actual Startup Time': 0.05,
          'Actual Total Time': 0.45,
          'Actual Rows': 48,
          'Actual Loops': 1,
          'Hash Cond': '(u.id = o.user_id)',
          'Shared Hit Blocks': 8,
          'Shared Read Blocks': 2,
          Plans: [
            {
              'Node Type': 'Seq Scan',
              'Relation Name': 'users',
              Alias: 'u',
              'Startup Cost': 0.0,
              'Total Cost': 14.5,
              'Plan Rows': 100,
              'Actual Startup Time': 0.01,
              'Actual Total Time': 0.12,
              'Actual Rows': 100,
              'Actual Loops': 1,
              Filter: '(age > 18)',
              'Shared Hit Blocks': 4,
            },
            {
              'Node Type': 'Index Scan',
              'Relation Name': 'orders',
              'Index Name': 'idx_orders_user_id',
              Alias: 'o',
              'Startup Cost': 0.15,
              'Total Cost': 8.2,
              'Plan Rows': 50,
              'Actual Startup Time': 0.02,
              'Actual Total Time': 0.08,
              'Actual Rows': 50,
              'Actual Loops': 1,
              'Shared Hit Blocks': 4,
            },
          ],
        },
        'Planning Time': 0.145,
        'Execution Time': 0.52,
      },
    ]);

    const res = explainParserService.parse(pgPlan, 'postgresql', 0.52);

    expect(res.executionTimeMs).toBe(0.52);
    expect(res.planningTimeMs).toBe(0.145);
    expect(res.totalCost).toBe(45.8);
    expect(res.root.nodeType).toBe('Hash Join');
    expect(res.root.children.length).toBe(2);
    expect(res.root.children[0]?.nodeType).toBe('Seq Scan');
    expect(res.root.children[0]?.relationName).toBe('users');
    expect(res.root.children[1]?.nodeType).toBe('Index Scan');
    expect(res.root.children[1]?.indexName).toBe('idx_orders_user_id');
    expect(res.bottleneckNodeId).toBeDefined();
  });

  it('parses MySQL JSON query_block explain format', () => {
    const mysqlPlan = JSON.stringify({
      query_block: {
        select_id: 1,
        cost_info: { query_cost: '10.50' },
        table: {
          table_name: 'customers',
          access_type: 'ALL',
          rows_examined_per_scan: 100,
          rows_produced_per_join: 20,
          cost_info: { read_cost: '8.00', eval_cost: '2.50', prefix_cost: '10.50' },
          attached_condition: 'customers.active = 1',
        },
      },
    });

    const res = explainParserService.parse(mysqlPlan, 'mysql', 1.2);

    expect(res.totalCost).toBe(10.5);
    expect(res.root.nodeType).toContain('Seq Scan');
    expect(res.root.relationName).toBe('customers');
    expect(res.root.planRows).toBe(100);
    expect(res.root.actualRows).toBe(20);
    expect(res.root.condition).toBe('customers.active = 1');
  });

  it('parses SQLite EXPLAIN QUERY PLAN tabular hierarchy', () => {
    const sqliteRows = JSON.stringify([
      { id: 2, parent: 0, notused: 0, detail: 'SCAN TABLE users' },
      { id: 3, parent: 0, notused: 0, detail: 'SEARCH TABLE orders USING INDEX idx_orders_user (user_id=?)' },
    ]);

    const res = explainParserService.parse(sqliteRows, 'sqlite', 0.8);

    expect(res.root.children.length).toBe(2);
    expect(res.root.children[0]?.nodeType).toBe('Seq Scan (Table Scan)');
    expect(res.root.children[0]?.relationName).toBe('users');
    expect(res.root.children[1]?.nodeType).toBe('Index Seek / Scan');
    expect(res.root.children[1]?.relationName).toBe('orders');
    expect(res.root.children[1]?.indexName).toBe('idx_orders_user');
  });
});
