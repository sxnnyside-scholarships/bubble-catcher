import type { AnalysisIssue } from '@shared/types';
import type { AnalysisRule } from '../rule.interface';
import type { AST } from 'node-sql-parser';

/**
 * Detects WHERE clauses with contradictory AND conditions that will
 * always return zero rows. For example:
 *   WHERE status = 'active' AND status = 'inactive'
 *   WHERE x = 1 AND x = 2
 *
 * Only checks simple column = literal equality comparisons joined by AND.
 */
export class ContradictoryConditionsRule implements AnalysisRule {
  readonly id = 'contradictory-conditions';
  readonly name = 'Contradictory AND Conditions';
  readonly description =
    'Detects WHERE clauses with AND conditions that can never be true simultaneously';

  analyze(ast: AST): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    this.visitNode(ast, issues);
    return issues;
  }

  private visitNode(node: unknown, issues: AnalysisIssue[]): void {
    if (!node || typeof node !== 'object') return;

    const record = node as Record<string, unknown>;

    if (record['where']) {
      const equalities = this.collectEqualities(record['where']);

      /* Group by qualified column name */
      const byColumn = new Map<string, Set<string>>();
      for (const { column, value } of equalities) {
        if (!byColumn.has(column)) byColumn.set(column, new Set());
        byColumn.get(column)!.add(value);
      }

      for (const [column, values] of byColumn) {
        if (values.size > 1) {
          const list = [...values].map((v) => `'${v}'`).join(', ');
          issues.push({
            ruleId: this.id,
            severity: 'error',
            message: `Column '${column}' is compared to multiple contradictory values: ${list}`,
            explanation:
              'A single column cannot simultaneously equal two different literal values when ' +
              'the conditions are joined by AND. This WHERE clause will always return zero rows. ' +
              'If you intended to match any of these values, use OR or IN(...) instead.',
            suggestedRewrite: null,
            line: null,
            column: null,
          });
        }
      }
    }

    /* Recurse into subqueries */
    const from = record['from'] as unknown[] | null;
    if (Array.isArray(from)) {
      for (const f of from) {
        const fr = f as Record<string, unknown>;
        if (fr['expr']) this.visitNode(fr['expr'], issues);
      }
    }
  }

  /**
   * Walk the WHERE tree and collect all equality conditions of the form
   * column_ref = literal that are joined exclusively by AND.
   */
  private collectEqualities(
    node: unknown,
  ): Array<{ column: string; value: string }> {
    if (!node || typeof node !== 'object') return [];

    const record = node as Record<string, unknown>;
    const type = record['type'] as string | undefined;

    if (type !== 'binary_expr') return [];

    const op = String(record['operator'] ?? '').toUpperCase();

    /* AND — recurse both branches */
    if (op === 'AND') {
      return [
        ...this.collectEqualities(record['left']),
        ...this.collectEqualities(record['right']),
      ];
    }

    /* Equality comparison */
    if (op === '=') {
      const left = record['left'] as Record<string, unknown> | undefined;
      const right = record['right'] as Record<string, unknown> | undefined;

      const pair = this.extractColumnLiteral(left, right);
      if (pair) return [pair];
    }

    return [];
  }

  private extractColumnLiteral(
    a: unknown,
    b: unknown,
  ): { column: string; value: string } | null {
    const ar = a as Record<string, unknown> | undefined;
    const br = b as Record<string, unknown> | undefined;
    if (!ar || !br) return null;

    if (ar['type'] === 'column_ref' && this.isLiteral(br)) {
      const table = ar['table'] ? `${ar['table']}.` : '';
      return { column: `${table}${ar['column']}`, value: String(br['value']) };
    }
    if (br['type'] === 'column_ref' && this.isLiteral(ar)) {
      const table = br['table'] ? `${br['table']}.` : '';
      return { column: `${table}${br['column']}`, value: String(ar['value']) };
    }
    return null;
  }

  private isLiteral(node: Record<string, unknown>): boolean {
    const t = node['type'] as string;
    return (
      t === 'number' ||
      t === 'string' ||
      t === 'single_quote_string' ||
      t === 'double_quote_string' ||
      t === 'bool'
    );
  }
}
