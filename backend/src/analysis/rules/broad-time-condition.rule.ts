import type { AnalysisIssue } from '@shared/types';
import type { AnalysisRule } from '../rule.interface';
import type { AST } from 'node-sql-parser';

/**
 * Detects DELETE / UPDATE statements whose WHERE clause contains a broad
 * time-based condition (e.g.  date < '2020-01-01') that could accidentally
 * affect a very large number of rows.
 *
 * Heuristic: looks for comparisons where one side is a column whose name
 * suggests a timestamp/date and the operator is <, <=, >, >= or BETWEEN.
 */
export class BroadTimeConditionRule implements AnalysisRule {
  readonly id = 'broad-time-condition';
  readonly name = 'Broad Time-Based DELETE / UPDATE';
  readonly description =
    'Detects DELETE/UPDATE with broad time-based WHERE conditions that may affect many rows';

  private static readonly TIME_COL_PATTERN = /date|time|created|updated|modified|timestamp|_at$/i;
  private static readonly RANGE_OPS = new Set(['<', '<=', '>', '>=', 'BETWEEN']);

  analyze(ast: AST): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    this.visitNode(ast, issues);
    return issues;
  }

  private visitNode(node: unknown, issues: AnalysisIssue[]): void {
    if (!node || typeof node !== 'object') return;

    const record = node as Record<string, unknown>;
    const type = record['type'] as string | undefined;

    if ((type === 'delete' || type === 'update') && record['where']) {
      this.scanWhere(record['where'], type, issues);
    }
  }

  private scanWhere(node: unknown, stmtType: string, issues: AnalysisIssue[]): void {
    if (!node || typeof node !== 'object') return;

    const record = node as Record<string, unknown>;
    const type = record['type'] as string | undefined;

    if (type === 'binary_expr') {
      const op = String(record['operator'] ?? '').toUpperCase();

      if (BroadTimeConditionRule.RANGE_OPS.has(op)) {
        const left = record['left'] as Record<string, unknown> | undefined;
        const right = record['right'] as Record<string, unknown> | undefined;

        const colName =
          this.extractTimeColumn(left) ?? this.extractTimeColumn(right);

        if (colName) {
          issues.push({
            ruleId: this.id,
            severity: 'warning',
            message: `${stmtType.toUpperCase()} uses broad range condition on time column '${colName}'`,
            explanation:
              `A ${stmtType.toUpperCase()} with a range comparison on a date/time column (${op}) ` +
              'can unintentionally affect a very large number of rows. Consider adding a LIMIT clause, ' +
              'narrowing the time range, or running a SELECT first to verify the affected row count.',
            suggestedRewrite: null,
            line: null,
            column: null,
          });
        }
      }

      this.scanWhere(record['left'], stmtType, issues);
      this.scanWhere(record['right'], stmtType, issues);
    }
  }

  private extractTimeColumn(node: unknown): string | null {
    if (!node || typeof node !== 'object') return null;
    const r = node as Record<string, unknown>;
    if (r['type'] === 'column_ref') {
      const col = String(r['column'] ?? '');
      if (BroadTimeConditionRule.TIME_COL_PATTERN.test(col)) return col;
    }
    return null;
  }
}
