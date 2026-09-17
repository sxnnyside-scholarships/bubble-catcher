import type { AnalysisIssue } from '@shared/types';
import type { AST, Select } from 'node-sql-parser';
import type { AnalysisRule } from '../rule.interface';

/**
 * Detects implicit Cartesian joins (cross joins) where tables
 * are listed in FROM without proper JOIN conditions.
 */
export class CartesianJoinRule implements AnalysisRule {
  readonly id = 'cartesian-join';
  readonly name = 'Cartesian Join Detection';
  readonly description = 'Detects implicit Cartesian products from missing join conditions';

  analyze(ast: AST): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    const record = ast as unknown as Record<string, unknown>;

    if (record['type'] !== 'select') return issues;
    const selectNode = ast as unknown as Select;

    if (!selectNode.from || !Array.isArray(selectNode.from) || selectNode.from.length < 2) return issues;

    /* Check if all items in FROM are plain tables (no explicit JOIN) */
    const plainTables: string[] = [];
    let hasExplicitJoin = false;

    for (const fromItem of selectNode.from) {
      const itemRecord = fromItem as unknown as Record<string, unknown>;
      if (itemRecord['join']) {
        hasExplicitJoin = true;
      }
      if (typeof itemRecord['table'] === 'string') {
        plainTables.push(itemRecord['table']);
      }
    }

    /* If we have multiple plain tables without explicit JOIN syntax, check for WHERE join conditions */
    if (plainTables.length >= 2 && !hasExplicitJoin) {
      const whereHasJoinCondition = this.whereContainsJoinCondition(selectNode.where, plainTables);

      if (!whereHasJoinCondition) {
        issues.push({
          ruleId: this.id,
          severity: 'error',
          message: `Potential Cartesian join between: ${plainTables.join(', ')}`,
          explanation:
            'When multiple tables are listed in the FROM clause without JOIN conditions, ' +
            'the database produces a Cartesian product — every row from one table is combined with every row ' +
            'from the other. If table A has 1,000 rows and table B has 1,000 rows, the result is 1,000,000 rows. ' +
            'Use explicit JOIN syntax with ON conditions instead.',
          suggestedRewrite: `SELECT ... FROM ${plainTables[0]} INNER JOIN ${plainTables[1]} ON ${plainTables[0]}.id = ${plainTables[1]}.${plainTables[0]}_id`,
          line: null,
          column: null,
        });
      }
    }

    return issues;
  }

  private whereContainsJoinCondition(where: unknown, tables: string[]): boolean {
    if (!where || typeof where !== 'object') return false;

    const record = where as Record<string, unknown>;
    const type = record['type'] as string | undefined;

    /* Binary expression with column references from different tables */
    if (type === 'binary_expr' && record['operator'] === '=') {
      const left = record['left'] as Record<string, unknown> | undefined;
      const right = record['right'] as Record<string, unknown> | undefined;

      if (left?.['type'] === 'column_ref' && right?.['type'] === 'column_ref') {
        const leftTable = left['table'] as string | undefined;
        const rightTable = right['table'] as string | undefined;

        if (
          leftTable &&
          rightTable &&
          tables.includes(leftTable) &&
          tables.includes(rightTable) &&
          leftTable !== rightTable
        ) {
          return true;
        }
      }

      return (
        this.whereContainsJoinCondition(record['left'], tables) ||
        this.whereContainsJoinCondition(record['right'], tables)
      );
    }

    /* AND / OR */
    if (type === 'binary_expr' && (record['operator'] === 'AND' || record['operator'] === 'OR')) {
      return (
        this.whereContainsJoinCondition(record['left'], tables) ||
        this.whereContainsJoinCondition(record['right'], tables)
      );
    }

    return false;
  }
}
