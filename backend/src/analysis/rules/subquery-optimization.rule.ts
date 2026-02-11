import type { AnalysisIssue } from '@shared/types';
import type { AnalysisRule } from '../rule.interface';
import type { AST, Select } from 'node-sql-parser';

/**
 * Detects subqueries in WHERE that could be rewritten as JOINs
 * for better performance in most SQL engines.
 */
export class SubqueryOptimizationRule implements AnalysisRule {
  readonly id = 'subquery-optimization';
  readonly name = 'Subquery Optimization';
  readonly description = 'Detects subqueries that could be rewritten as JOINs';

  analyze(ast: AST): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    const record = ast as unknown as Record<string, unknown>;

    if (record['type'] !== 'select') return issues;
    const selectNode = ast as unknown as Select;

    if (selectNode.where) {
      this.checkForSubqueries(selectNode.where, issues);
    }

    return issues;
  }

  private checkForSubqueries(node: unknown, issues: AnalysisIssue[]): void {
    if (!node || typeof node !== 'object') return;

    const record = node as Record<string, unknown>;
    const type = record['type'] as string | undefined;

    /* IN with subquery */
    if (type === 'binary_expr' && record['operator'] === 'IN') {
      const right = record['right'] as Record<string, unknown> | undefined;
      if (right?.['type'] === 'expr_list' || this.isSubquery(right)) {
        issues.push({
          ruleId: this.id,
          severity: 'info',
          message: 'Subquery in IN clause could potentially be rewritten as a JOIN',
          explanation:
            'Subqueries in IN clauses can be less efficient than equivalent JOIN operations in many SQL engines. ' +
            'The optimizer may execute the subquery once per row in the outer query. A JOIN allows the optimizer ' +
            'to choose a more efficient execution plan. However, modern optimizers often handle this automatically — ' +
            'check your execution plan to confirm.',
          suggestedRewrite:
            'SELECT t1.* FROM table1 t1 INNER JOIN table2 t2 ON t1.id = t2.foreign_id -- rewrite IN as JOIN',
          line: null,
          column: null,
        });
      }
    }

    /* EXISTS with subquery */
    if (type === 'unary_expr' && record['operator'] === 'EXISTS') {
      issues.push({
        ruleId: this.id,
        severity: 'info',
        message: 'EXISTS subquery detected — verify it is necessary',
        explanation:
          'EXISTS subqueries are valid and sometimes optimal, but ensure they are correlated to the outer query. ' +
          'An uncorrelated EXISTS always returns the same result and may indicate a logic error.',
        suggestedRewrite: null,
        line: null,
        column: null,
      });
    }

    /* Recurse */
    if (record['left']) this.checkForSubqueries(record['left'], issues);
    if (record['right']) this.checkForSubqueries(record['right'], issues);
    if (record['expr']) this.checkForSubqueries(record['expr'], issues);
    if (record['args']) {
      const args = record['args'];
      if (Array.isArray(args)) {
        args.forEach((arg) => this.checkForSubqueries(arg, issues));
      } else if (typeof args === 'object') {
        this.checkForSubqueries(args, issues);
      }
    }
  }

  private isSubquery(node: unknown): boolean {
    if (!node || typeof node !== 'object') return false;
    const record = node as Record<string, unknown>;
    return record['type'] === 'select' || record['ast'] !== undefined;
  }
}
