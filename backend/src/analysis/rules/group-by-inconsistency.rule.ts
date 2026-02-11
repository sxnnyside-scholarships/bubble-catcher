import type { AnalysisIssue } from '@shared/types';
import type { AnalysisRule } from '../rule.interface';
import type { AST } from 'node-sql-parser';

/**
 * Detects SELECT columns that are neither aggregated nor listed in the GROUP BY clause.
 * This is an error in strict SQL modes and can produce non-deterministic results elsewhere.
 */
export class GroupByInconsistencyRule implements AnalysisRule {
  readonly id = 'group-by-inconsistency';
  readonly name = 'GROUP BY Inconsistency';
  readonly description =
    'Detects non-aggregated columns that are missing from the GROUP BY clause';

  private static readonly AGGREGATE_FUNS = new Set([
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
    'GROUP_CONCAT', 'STRING_AGG', 'ARRAY_AGG',
    'LISTAGG', 'COLLECT', 'XMLAGG',
  ]);

  analyze(ast: AST): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    this.visitSelect(ast, issues);
    return issues;
  }

  private visitSelect(node: unknown, issues: AnalysisIssue[]): void {
    if (!node || typeof node !== 'object') return;

    const record = node as Record<string, unknown>;
    const type = record['type'] as string | undefined;

    if (type === 'select') {
      const groupBy = record['groupby'] as unknown[] | null;
      const columns = record['columns'] as unknown[] | null;

      if (groupBy && Array.isArray(groupBy) && groupBy.length > 0 && Array.isArray(columns)) {
        /* Collect group-by column names (simple references only) */
        const groupedCols = new Set<string>();
        for (const g of groupBy) {
          const gr = g as Record<string, unknown>;
          const expr = gr['expr'] ?? gr;
          const exr = expr as Record<string, unknown>;
          if (exr['type'] === 'column_ref') {
            const col = String(exr['column'] ?? '').toLowerCase();
            if (col) groupedCols.add(col);
          }
        }

        /* Check each SELECT column */
        for (const col of columns) {
          if (col === '*') continue;
          const cr = col as Record<string, unknown>;
          const expr = cr['expr'] as Record<string, unknown> | undefined;
          if (!expr) continue;

          /* Skip if the column is wrapped in an aggregate function */
          if (this.isAggregate(expr)) continue;

          /* Plain column_ref that is not in the group-by set */
          if (expr['type'] === 'column_ref') {
            const name = String(expr['column'] ?? '').toLowerCase();
            if (name && !groupedCols.has(name)) {
              issues.push({
                ruleId: this.id,
                severity: 'warning',
                message: `Column '${name}' is in SELECT but not in GROUP BY and not aggregated`,
                explanation:
                  'In standard SQL, every column in the SELECT list must either appear in the GROUP BY clause ' +
                  'or be used inside an aggregate function. Non-grouped, non-aggregated columns produce ' +
                  'undefined behavior in most engines and will raise errors in strict mode.',
                suggestedRewrite: null,
                line: null,
                column: null,
              });
            }
          }
        }
      }

      /* Recurse into subqueries in FROM */
      const from = record['from'] as unknown[] | null;
      if (Array.isArray(from)) {
        for (const f of from) {
          const fr = f as Record<string, unknown>;
          if (fr['expr']) this.visitSelect(fr['expr'], issues);
        }
      }
    }
  }

  private isAggregate(expr: Record<string, unknown>): boolean {
    if (expr['type'] === 'aggr_func') return true;
    if (expr['type'] === 'function') {
      const name = String(expr['name'] ?? '').toUpperCase();
      if (GroupByInconsistencyRule.AGGREGATE_FUNS.has(name)) return true;
    }
    return false;
  }
}
