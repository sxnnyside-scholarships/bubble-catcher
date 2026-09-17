import type { AnalysisIssue } from '@shared/types';
import type { AST } from 'node-sql-parser';
import type { AnalysisRule } from '../rule.interface';

/**
 * Detects LIKE patterns with a leading wildcard (e.g. LIKE '%foo'),
 * which prevents the use of indexes and forces a full table scan.
 */
export class LeadingWildcardRule implements AnalysisRule {
  readonly id = 'leading-wildcard';
  readonly name = 'Leading Wildcard in LIKE';
  readonly description = 'Detects LIKE patterns starting with % which prevent index usage';

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
      const op = (record['operator'] as string)?.toUpperCase();

      if (op === 'LIKE' || op === 'NOT LIKE') {
        const right = record['right'] as Record<string, unknown> | undefined;
        if (right?.['type'] === 'single_quote_string' || right?.['type'] === 'string') {
          const value = String(right['value'] ?? '');
          if (value.startsWith('%')) {
            issues.push({
              ruleId: this.id,
              severity: 'warning',
              message: `LIKE with leading wildcard ('${value}') prevents index usage`,
              explanation:
                'A LIKE pattern that starts with % forces the database to scan every row in the table ' +
                'because the index cannot be used for prefix matching. For large tables this causes significant ' +
                'performance degradation. Consider full-text search, reverse indexes, or restructuring the query.',
              suggestedRewrite: null,
              line: null,
              column: null,
            });
          }
        }
      }

      /* Recurse into left/right branches */
      this.visitNode(record['left'], issues);
      this.visitNode(record['right'], issues);
    }

    /* AND / OR */
    if (type === 'binary_expr' && record['left']) {
      this.visitNode(record['left'], issues);
    }
    if (record['where']) this.visitNode(record['where'], issues);
    if (record['having']) this.visitNode(record['having'], issues);
  }
}
