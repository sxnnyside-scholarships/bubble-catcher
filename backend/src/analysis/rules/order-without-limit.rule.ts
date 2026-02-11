import type { AnalysisIssue } from '@shared/types';
import type { AnalysisRule } from '../rule.interface';
import type { AST, Select } from 'node-sql-parser';

/**
 * Detects ORDER BY without LIMIT, which forces the engine to sort
 * the entire result set even when only a subset is needed.
 */
export class OrderWithoutLimitRule implements AnalysisRule {
  readonly id = 'order-without-limit';
  readonly name = 'ORDER BY without LIMIT';
  readonly description = 'Detects ORDER BY clauses without a corresponding LIMIT';

  analyze(ast: AST): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    this.visitNode(ast, issues);
    return issues;
  }

  private visitNode(node: unknown, issues: AnalysisIssue[]): void {
    if (!node || typeof node !== 'object') return;

    const record = node as Record<string, unknown>;

    if (record['type'] === 'select') {
      const selectNode = node as Select;
      const orderby = record['orderby'] as unknown[] | null | undefined;
      const limit = record['limit'] as unknown | null | undefined;

      if (orderby && Array.isArray(orderby) && orderby.length > 0 && !limit) {
        issues.push({
          ruleId: this.id,
          severity: 'info',
          message: 'ORDER BY without LIMIT may sort the entire table unnecessarily',
          explanation:
            'When ORDER BY is used without LIMIT, the database must sort every row in the result set. ' +
            'For large tables this can be extremely expensive. If you only need the top/bottom N rows, ' +
            'add a LIMIT clause. If you genuinely need all rows sorted, this warning can be ignored.',
          suggestedRewrite: 'SELECT ... FROM ... ORDER BY column LIMIT 100 -- add a LIMIT',
          line: null,
          column: null,
        });
      }

      /* Recurse into subqueries */
      if (selectNode.from && Array.isArray(selectNode.from)) {
        for (const fromItem of selectNode.from) {
          const fr = fromItem as unknown as Record<string, unknown>;
          if (fr['expr']) this.visitNode(fr['expr'], issues);
        }
      }
      if (selectNode.where) this.visitNode(selectNode.where, issues);
    }
  }
}
