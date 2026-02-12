import type { AnalysisIssue } from '@shared/types';
import type { AnalysisRule, PlanTier } from '../rule.interface';
import type { AST } from 'node-sql-parser';

/**
 * Detects WHERE conditions that compare a column to a value of
 * a different type (string literal vs number, etc.), which causes
 * implicit type conversion and prevents index usage.
 *
 * Premium rule.
 */
export class ImplicitTypeConversionRule implements AnalysisRule {
  readonly id = 'implicit-type-conversion';
  readonly name = 'Implicit Type Conversion';
  readonly description = 'Detects comparisons that may cause implicit type conversion';
  readonly requiresPlan: PlanTier = 'premium';

  analyze(ast: AST): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    const record = ast as unknown as Record<string, unknown>;

    if (record['where']) {
      this.scanConditions(record['where'], issues);
    }

    return issues;
  }

  private scanConditions(node: unknown, issues: AnalysisIssue[]): void {
    if (!node || typeof node !== 'object') return;

    const record = node as Record<string, unknown>;
    const type = record['type'] as string | undefined;

    if (type === 'binary_expr') {
      const op = String(record['operator'] ?? '').toUpperCase();

      if (['=', '!=', '<>', '>', '<', '>=', '<='].includes(op)) {
        const left = record['left'] as Record<string, unknown> | undefined;
        const right = record['right'] as Record<string, unknown> | undefined;

        if (left && right) {
          const suspect = this.detectTypeMismatch(left, right);
          if (suspect) {
            issues.push({
              ruleId: this.id,
              severity: 'warning',
              message: `Column '${suspect.column}' compared to a ${suspect.valueType} literal — possible implicit conversion`,
              explanation:
                'Comparing a column with a value of a different type (e.g., a numeric column compared to a string) ' +
                'causes implicit type conversion. This prevents the database from using indexes on that column ' +
                'and forces a full scan. Ensure the comparison value matches the column type.',
              suggestedRewrite: null,
              line: null,
              column: null,
            });
          }
        }
      }

      this.scanConditions(record['left'], issues);
      this.scanConditions(record['right'], issues);
    }
  }

  private detectTypeMismatch(
    left: Record<string, unknown>,
    right: Record<string, unknown>,
  ): { column: string; valueType: string } | null {
    /* column = string_literal where column name suggests numeric (id, count, age, etc.) */
    if (left['type'] === 'column_ref' && this.isStringLiteral(right)) {
      const col = String(left['column'] ?? '');
      if (this.looksNumeric(col)) {
        return { column: col, valueType: 'string' };
      }
    }

    /* column = number where column name suggests string (name, email, status, etc.) */
    if (left['type'] === 'column_ref' && right['type'] === 'number') {
      const col = String(left['column'] ?? '');
      if (this.looksString(col)) {
        return { column: col, valueType: 'number' };
      }
    }

    return null;
  }

  private isStringLiteral(node: Record<string, unknown>): boolean {
    const t = node['type'] as string;
    return t === 'string' || t === 'single_quote_string' || t === 'double_quote_string';
  }

  private looksNumeric(col: string): boolean {
    return /^id$|_id$|_count$|^count$|^age$|^amount$|^price$|^qty$|^quantity$|^total$|^num_/i.test(col);
  }

  private looksString(col: string): boolean {
    return /^name$|^email$|^status$|^type$|^title$|^description$|^label$|^code$|^slug$/i.test(col);
  }
}
