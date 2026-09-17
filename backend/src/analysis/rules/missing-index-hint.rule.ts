import type { AnalysisIssue } from '@shared/types';
import type { AST, Select } from 'node-sql-parser';
import type { AnalysisRule } from '../rule.interface';

/**
 * Heuristic: detects queries that filter on non-key columns without
 * apparent index support. Suggests adding an index for performance.
 *
 * Premium rule.
 */
export class MissingIndexHintRule implements AnalysisRule {
  readonly id = 'missing-index-hint';
  readonly name = 'Missing Index Hint';
  readonly description = 'Suggests indexes for filtered columns that appear unindexed';

  analyze(ast: AST): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    const record = ast as unknown as Record<string, unknown>;

    if (record['type'] !== 'select') return issues;
    const selectNode = ast as unknown as Select;

    if (selectNode.where) {
      const cols = this.extractFilteredColumns(selectNode.where);
      /* Only flag when filtering on non-key looking columns */
      const nonKeyCols = cols.filter((c) => !/^id$|_id$|_pk$|_fk$/i.test(c));

      if (nonKeyCols.length > 0) {
        issues.push({
          ruleId: this.id,
          severity: 'info',
          message: `Query filters on column(s) that may lack an index: ${nonKeyCols.join(', ')}`,
          explanation:
            'Filtering or joining on columns without an index forces a full table scan. ' +
            'Adding an index on these columns can dramatically improve performance on large tables.',
          suggestedRewrite: `CREATE INDEX idx_${nonKeyCols[0]} ON table_name (${nonKeyCols.join(', ')});`,
          line: null,
          column: null,
        });
      }
    }

    return issues;
  }

  private extractFilteredColumns(node: unknown): string[] {
    if (!node || typeof node !== 'object') return [];
    const record = node as Record<string, unknown>;
    const type = record['type'] as string | undefined;
    const cols: string[] = [];

    if (type === 'binary_expr') {
      const op = String(record['operator'] ?? '').toUpperCase();

      if (['=', '!=', '<>', '>', '<', '>=', '<=', 'LIKE', 'NOT LIKE', 'IN'].includes(op)) {
        const left = record['left'] as Record<string, unknown> | undefined;
        if (left?.['type'] === 'column_ref') {
          cols.push(String(left['column'] ?? ''));
        }
      }

      cols.push(...this.extractFilteredColumns(record['left']));
      cols.push(...this.extractFilteredColumns(record['right']));
    }

    return [...new Set(cols)].filter(Boolean);
  }
}
