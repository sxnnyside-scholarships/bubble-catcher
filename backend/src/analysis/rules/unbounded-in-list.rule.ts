import type { AnalysisIssue } from '@shared/types';
import type { AST } from 'node-sql-parser';
import type { AnalysisRule } from '../rule.interface';

/**
 * Detects IN clauses with a large number of literal values,
 * which can overwhelm the query optimizer.
 *
 * Premium rule.
 */
export class UnboundedInListRule implements AnalysisRule {
  readonly id = 'unbounded-in-list';
  readonly name = 'Large IN List';
  readonly description = 'Detects IN clauses with many literal values';

  private static readonly THRESHOLD = 10;

  analyze(ast: AST): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    this.visitNode(ast, issues);
    return issues;
  }

  private visitNode(node: unknown, issues: AnalysisIssue[]): void {
    if (!node || typeof node !== 'object') return;

    const record = node as Record<string, unknown>;
    const type = record['type'] as string | undefined;

    if (type === 'binary_expr') {
      const op = String(record['operator'] ?? '').toUpperCase();

      if (op === 'IN') {
        const right = record['right'] as Record<string, unknown> | undefined;
        if (right?.['type'] === 'expr_list') {
          const values = right['value'] as unknown[];
          if (Array.isArray(values) && values.length > UnboundedInListRule.THRESHOLD) {
            issues.push({
              ruleId: this.id,
              severity: 'warning',
              message: `IN clause contains ${values.length} values (threshold: ${UnboundedInListRule.THRESHOLD})`,
              explanation:
                'Large IN (...) lists can overwhelm the query optimizer and cause poor performance. ' +
                'Consider using a temporary table, a JOIN with a values list, or batching the values ' +
                'into multiple smaller queries for better performance.',
              suggestedRewrite: 'SELECT ... FROM table INNER JOIN (VALUES (...)) AS v(id) ON table.id = v.id',
              line: null,
              column: null,
            });
          }
        }
      }

      this.visitNode(record['left'], issues);
      this.visitNode(record['right'], issues);
    }

    if (record['where']) this.visitNode(record['where'], issues);
    if (record['having']) this.visitNode(record['having'], issues);
  }
}
