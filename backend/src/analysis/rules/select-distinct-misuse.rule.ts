import type { AnalysisIssue } from '@shared/types';
import type { AST, Select } from 'node-sql-parser';
import type { AnalysisRule } from '../rule.interface';

/**
 * Detects SELECT DISTINCT that may be masking a JOIN issue
 * rather than being genuinely needed.
 *
 * Premium rule.
 */
export class SelectDistinctMisuseRule implements AnalysisRule {
  readonly id = 'select-distinct-misuse';
  readonly name = 'SELECT DISTINCT Misuse';
  readonly description = 'Detects DISTINCT that may mask incorrect JOINs';

  analyze(ast: AST): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    const record = ast as unknown as Record<string, unknown>;

    if (record['type'] !== 'select') return issues;
    const selectNode = ast as unknown as Select;

    const distinct = record['distinct'] as string | boolean | null;
    const from = selectNode.from as unknown[] | null;

    /* DISTINCT + JOIN = suspicious */
    if (distinct && Array.isArray(from)) {
      const hasJoin = from.some((f) => {
        const fr = f as Record<string, unknown>;
        return !!fr['join'];
      });

      if (hasJoin) {
        issues.push({
          ruleId: this.id,
          severity: 'warning',
          message: 'SELECT DISTINCT with JOIN may mask a join issue',
          explanation:
            'Using DISTINCT on a query with JOINs is sometimes used to hide duplicate rows ' +
            'caused by incorrect join conditions. Verify the JOIN conditions produce the expected ' +
            'cardinality before relying on DISTINCT to remove duplicates.',
          suggestedRewrite: null,
          line: null,
          column: null,
        });
      }
    }

    return issues;
  }
}
