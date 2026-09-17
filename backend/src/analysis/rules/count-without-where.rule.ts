import type { AnalysisIssue } from '@shared/types';
import type { AST } from 'node-sql-parser';
import type { AnalysisRule } from '../rule.interface';

/**
 * Detects COUNT(*) / COUNT(1) on a SELECT without a WHERE clause,
 * which forces a full table scan.
 *
 * Premium rule.
 */
export class CountWithoutWhereRule implements AnalysisRule {
  readonly id = 'count-without-where';
  readonly name = 'COUNT(*) Without WHERE';
  readonly description = 'Detects COUNT(*) queries without a WHERE clause';

  analyze(ast: AST): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    const record = ast as unknown as Record<string, unknown>;

    if (record['type'] !== 'select') return issues;

    const columns = record['columns'] as unknown[];
    const where = record['where'] as unknown;

    if (!Array.isArray(columns)) return issues;

    const hasCountStar = columns.some((col) => {
      if (col === '*') return false;
      const cr = col as Record<string, unknown>;
      const expr = cr['expr'] as Record<string, unknown> | undefined;
      if (!expr) return false;

      /* aggr_func node with name COUNT */
      if (expr['type'] === 'aggr_func') {
        const name = String(expr['name'] ?? '').toUpperCase();
        if (name === 'COUNT') {
          const args = expr['args'] as Record<string, unknown> | undefined;
          if (args) {
            const argsExpr = args['expr'] as Record<string, unknown> | undefined;
            /* COUNT(*) or COUNT(1) */
            if (argsExpr?.['type'] === 'star' || (argsExpr?.['type'] === 'column_ref' && argsExpr?.['column'] === '*'))
              return true;
            if (argsExpr?.['type'] === 'number' && argsExpr?.['value'] === 1) return true;
          }
        }
      }
      return false;
    });

    if (hasCountStar && !where) {
      issues.push({
        ruleId: this.id,
        severity: 'info',
        message: 'COUNT(*) without WHERE scans the entire table',
        explanation:
          'Running COUNT(*) without a WHERE clause forces the database to scan every row. ' +
          'On large tables this can be very slow. Add a WHERE clause to narrow the count, ' +
          'or use approximate count functions if exact numbers are not required.',
        suggestedRewrite: 'SELECT COUNT(*) FROM table WHERE condition -- add a filter',
        line: null,
        column: null,
      });
    }

    return issues;
  }
}
