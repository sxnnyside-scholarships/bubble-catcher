import type { AnalysisIssue } from '@shared/types';
import type { AnalysisRule } from '../rule.interface';
import type { AST, Delete, Update } from 'node-sql-parser';

/**
 * Detects DELETE or UPDATE statements without a WHERE clause,
 * which would affect all rows in the table.
 */
export class MissingWhereRule implements AnalysisRule {
  readonly id = 'missing-where';
  readonly name = 'Missing WHERE Clause';
  readonly description = 'Detects DELETE/UPDATE without WHERE clause';

  analyze(ast: AST): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    const record = ast as unknown as Record<string, unknown>;
    const type = record['type'] as string | undefined;

    if (type === 'delete') {
      const deleteNode = ast as unknown as Delete;
      if (!deleteNode.where) {
        const tableName = this.extractDeleteTable(deleteNode);
        issues.push({
          ruleId: this.id,
          severity: 'critical',
          message: `DELETE without WHERE clause will remove ALL rows${tableName ? ` from ${tableName}` : ''}`,
          explanation:
            'Running DELETE without a WHERE clause will permanently remove every row in the table. ' +
            'This is almost never intentional in production. Always include a WHERE clause to target specific rows. ' +
            'If you truly need to remove all rows, use TRUNCATE TABLE instead for better performance and clarity.',
          suggestedRewrite: tableName
            ? `DELETE FROM ${tableName} WHERE id = ? -- add appropriate condition`
            : 'DELETE FROM table WHERE condition -- add appropriate condition',
          line: null,
          column: null,
        });
      }
    }

    if (type === 'update') {
      const updateNode = ast as unknown as Update;
      if (!updateNode.where) {
        const tableName = this.extractUpdateTable(updateNode);
        issues.push({
          ruleId: this.id,
          severity: 'critical',
          message: `UPDATE without WHERE clause will modify ALL rows${tableName ? ` in ${tableName}` : ''}`,
          explanation:
            'Running UPDATE without a WHERE clause will change the specified columns for every row in the table. ' +
            'This is extremely dangerous in production. Always filter the rows you intend to update.',
          suggestedRewrite: tableName
            ? `UPDATE ${tableName} SET column = value WHERE id = ? -- add appropriate condition`
            : 'UPDATE table SET column = value WHERE condition -- add appropriate condition',
          line: null,
          column: null,
        });
      }
    }

    return issues;
  }

  private extractDeleteTable(node: Delete): string | null {
    const record = node as unknown as Record<string, unknown>;
    const from = record['from'] ?? record['table'];
    if (Array.isArray(from) && from.length > 0) {
      const first = from[0] as Record<string, unknown>;
      return (first['table'] as string) ?? null;
    }
    if (from && typeof from === 'object') {
      return ((from as Record<string, unknown>)['table'] as string) ?? null;
    }
    return null;
  }

  private extractUpdateTable(node: Update): string | null {
    const record = node as unknown as Record<string, unknown>;
    const table = record['table'];
    if (Array.isArray(table) && table.length > 0) {
      const first = table[0] as Record<string, unknown>;
      return (first['table'] as string) ?? null;
    }
    return null;
  }
}
