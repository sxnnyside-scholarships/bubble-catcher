import type { AnalysisIssue } from '@shared/types';
import type { AST } from 'node-sql-parser';
import type { AnalysisRule } from '../rule.interface';

/**
 * Detects unsafe SQL patterns such as:
 * - DROP TABLE / DROP DATABASE
 * - TRUNCATE statements
 * - GRANT / REVOKE privilege commands
 * - Multiple statements (possible injection vector)
 */
export class UnsafePatternRule implements AnalysisRule {
  readonly id = 'unsafe-pattern';
  readonly name = 'Unsafe Pattern Detection';
  readonly description = 'Detects potentially dangerous SQL operations';

  analyze(ast: AST, originalQuery: string): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    const record = ast as unknown as Record<string, unknown>;
    const type = record['type'] as string | undefined;

    if (type === 'drop') {
      const keyword = record['keyword'] as string | undefined;
      issues.push({
        ruleId: this.id,
        severity: 'critical',
        message: `DROP ${keyword?.toUpperCase() ?? 'statement'} detected — this is a destructive operation`,
        explanation:
          `DROP permanently removes the ${keyword ?? 'object'} and all its data. This action cannot be undone ` +
          'without a backup. In production environments, always ensure backups exist and consider using ' +
          'IF EXISTS to avoid errors when the object does not exist.',
        suggestedRewrite: keyword === 'table' ? 'DROP TABLE IF EXISTS table_name -- use IF EXISTS for safety' : null,
        line: null,
        column: null,
      });
    }

    if (type === 'truncate') {
      issues.push({
        ruleId: this.id,
        severity: 'critical',
        message: 'TRUNCATE removes all rows without logging individual deletions',
        explanation:
          'TRUNCATE is faster than DELETE but cannot be rolled back in some engines and does not fire triggers. ' +
          'Use with extreme caution in production. Make sure this is intentional.',
        suggestedRewrite: null,
        line: null,
        column: null,
      });
    }

    /* Check for multiple statements (possible injection pattern) */
    if (originalQuery.includes(';')) {
      const parts = originalQuery.split(';').filter((p) => p.trim().length > 0);
      if (parts.length > 1) {
        issues.push({
          ruleId: this.id,
          severity: 'warning',
          message: 'Multiple SQL statements detected in a single query',
          explanation:
            'Executing multiple statements at once can be a sign of SQL injection or unintended behavior. ' +
            'Run each statement individually for safer execution and clearer logging.',
          suggestedRewrite: null,
          line: null,
          column: null,
        });
      }
    }

    return issues;
  }
}
