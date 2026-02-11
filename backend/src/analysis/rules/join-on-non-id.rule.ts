import type { AnalysisIssue } from '@shared/types';
import type { AnalysisRule } from '../rule.interface';
import type { AST } from 'node-sql-parser';

/**
 * Heuristic: detects JOIN conditions where neither side looks like a
 * primary key or foreign key column (i.e. name does not contain "id",
 * "_id", "_key", "_pk", "_fk", "_ref").
 *
 * Joining on non-key fields is sometimes valid but is a common source
 * of unintended cross joins or poor performance.
 */
export class JoinOnNonIdRule implements AnalysisRule {
  readonly id = 'join-on-non-id';
  readonly name = 'JOIN on Non-Key Column';
  readonly description =
    'Detects JOIN conditions where neither column appears to be a key field';

  private static readonly KEY_PATTERN = /^id$|_id$|_key$|_pk$|_fk$|_ref$|^pk$|^fk$/i;

  analyze(ast: AST): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    this.visitNode(ast, issues);
    return issues;
  }

  private visitNode(node: unknown, issues: AnalysisIssue[]): void {
    if (!node || typeof node !== 'object') return;

    const record = node as Record<string, unknown>;
    const from = record['from'] as unknown[] | null;

    if (Array.isArray(from)) {
      for (const table of from) {
        const t = table as Record<string, unknown>;
        const join = t['join'] as string | undefined;
        const on = t['on'] as Record<string, unknown> | undefined;

        if (join && on) {
          this.scanOnCondition(on, issues);
        }
      }
    }

    /* Recurse into subqueries */
    if (Array.isArray(from)) {
      for (const f of from) {
        const fr = f as Record<string, unknown>;
        if (fr['expr']) this.visitNode(fr['expr'], issues);
      }
    }
  }

  private scanOnCondition(node: unknown, issues: AnalysisIssue[]): void {
    if (!node || typeof node !== 'object') return;

    const record = node as Record<string, unknown>;
    const type = record['type'] as string | undefined;

    if (type === 'binary_expr') {
      const op = String(record['operator'] ?? '').toUpperCase();

      if (op === '=') {
        const left = record['left'] as Record<string, unknown> | undefined;
        const right = record['right'] as Record<string, unknown> | undefined;

        if (
          left?.['type'] === 'column_ref' &&
          right?.['type'] === 'column_ref'
        ) {
          const leftCol = String(left['column'] ?? '');
          const rightCol = String(right['column'] ?? '');

          const leftIsKey = JoinOnNonIdRule.KEY_PATTERN.test(leftCol);
          const rightIsKey = JoinOnNonIdRule.KEY_PATTERN.test(rightCol);

          if (!leftIsKey && !rightIsKey) {
            issues.push({
              ruleId: this.id,
              severity: 'info',
              message: `JOIN condition uses '${leftCol}' = '${rightCol}', neither appears to be a key column`,
              explanation:
                'Joining tables on columns that are not primary or foreign keys may be intentional, ' +
                'but is often a mistake that produces unexpected row multiplication or poor performance. ' +
                'Verify that the join condition is correct and consider adding an index on the join columns.',
              suggestedRewrite: null,
              line: null,
              column: null,
            });
          }
        }
      }

      this.scanOnCondition(record['left'], issues);
      this.scanOnCondition(record['right'], issues);
    }
  }
}
