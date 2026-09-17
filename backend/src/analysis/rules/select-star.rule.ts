import type { AnalysisIssue } from '@shared/types';
import type { AST, Select } from 'node-sql-parser';
import type { AnalysisRule } from '../rule.interface';

/**
 * Detects SELECT * usage which can cause performance issues
 * and makes code fragile to schema changes.
 */
export class SelectStarRule implements AnalysisRule {
  readonly id = 'select-star';
  readonly name = 'SELECT * Detection';
  readonly description = 'Detects usage of SELECT * which selects all columns';

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
      if (this.hasSelectStar(selectNode)) {
        const tableName = this.extractTableName(selectNode);
        issues.push({
          ruleId: this.id,
          severity: 'warning',
          message: 'Avoid using SELECT *',
          explanation:
            'SELECT * retrieves all columns from the table, which can lead to unnecessary data transfer, ' +
            'slower queries, and fragile code that breaks when schema changes. Instead, explicitly list ' +
            'only the columns you need.',
          suggestedRewrite: tableName
            ? `SELECT column1, column2 FROM ${tableName} -- specify needed columns`
            : 'SELECT column1, column2 FROM your_table -- specify needed columns',
          line: null,
          column: null,
        });
      }

      /* Check subqueries in FROM */
      if (selectNode.from && Array.isArray(selectNode.from)) {
        for (const fromItem of selectNode.from) {
          const fromRecord = fromItem as unknown as Record<string, unknown>;
          if (fromRecord['expr'] && typeof fromRecord['expr'] === 'object') {
            this.visitNode(fromRecord['expr'], issues);
          }
        }
      }

      /* Check subqueries in WHERE */
      if (selectNode.where) {
        this.visitNode(selectNode.where, issues);
      }
    }
  }

  private hasSelectStar(node: Select): boolean {
    const columns: unknown = node.columns;
    if (columns === '*') return true;
    if (Array.isArray(columns)) {
      return columns.some((col) => {
        const colRecord = col as Record<string, unknown>;
        const expr = colRecord['expr'] as Record<string, unknown> | undefined;
        return expr?.['type'] === 'column_ref' && expr?.['column'] === '*';
      });
    }
    return false;
  }

  private extractTableName(node: Select): string | null {
    if (node.from && Array.isArray(node.from) && node.from.length > 0) {
      const firstFrom = node.from[0] as unknown as Record<string, unknown>;
      if (typeof firstFrom['table'] === 'string') {
        return firstFrom['table'];
      }
    }
    return null;
  }
}
