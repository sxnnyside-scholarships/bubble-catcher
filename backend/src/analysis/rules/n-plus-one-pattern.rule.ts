import type { AnalysisIssue } from '@shared/types';
import type { AST } from 'node-sql-parser';
import type { AnalysisRule } from '../rule.interface';

/**
 * Detects correlated subqueries in the SELECT column list,
 * which execute once per row (N+1 pattern).
 *
 * Premium rule.
 */
export class NPlusOnePatternRule implements AnalysisRule {
  readonly id = 'n-plus-one-pattern';
  readonly name = 'N+1 Query Pattern';
  readonly description = 'Detects correlated subqueries in SELECT that cause N+1 execution';

  analyze(ast: AST): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    const record = ast as unknown as Record<string, unknown>;

    if (record['type'] !== 'select') return issues;
    const columns = record['columns'] as unknown[];
    if (!Array.isArray(columns)) return issues;

    for (const col of columns) {
      if (col === '*') continue;
      const cr = col as Record<string, unknown>;
      const expr = cr['expr'] as Record<string, unknown> | undefined;

      if (expr && this.isSubquery(expr)) {
        issues.push({
          ruleId: this.id,
          severity: 'warning',
          message: 'Correlated subquery in SELECT list (N+1 pattern)',
          explanation:
            'A subquery in the SELECT column list executes once for each row in the outer query. ' +
            'If the outer query returns N rows, the subquery runs N times — this is the N+1 problem. ' +
            'Rewriting as a JOIN or using a window function can dramatically improve performance.',
          suggestedRewrite: 'SELECT t1.*, t2.value FROM table1 t1 LEFT JOIN table2 t2 ON t1.id = t2.foreign_id',
          line: null,
          column: null,
        });
        break; // one warning is enough
      }
    }

    return issues;
  }

  private isSubquery(node: unknown): boolean {
    if (!node || typeof node !== 'object') return false;
    const record = node as Record<string, unknown>;
    if (record['type'] === 'select') return true;
    if (record['ast'] !== undefined) return true;
    /* Check expr wrapper */
    if (record['type'] === 'expr' && record['value']) {
      return this.isSubquery(record['value']);
    }
    return false;
  }
}
