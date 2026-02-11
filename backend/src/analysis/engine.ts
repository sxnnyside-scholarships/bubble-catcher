import { Parser } from 'node-sql-parser';
import type { AnalysisResult } from '@shared/types';
import type { AnalysisRule } from './rule.interface';
import {
  SelectStarRule,
  MissingWhereRule,
  CartesianJoinRule,
  SubqueryOptimizationRule,
  UnsafePatternRule,
  OrderWithoutLimitRule,
  LeadingWildcardRule,
  GroupByInconsistencyRule,
  BroadTimeConditionRule,
  JoinOnNonIdRule,
  ContradictoryConditionsRule,
} from './rules';

/** Maps our dialect names to node-sql-parser database values */
const DIALECT_MAP: Record<string, string> = {
  mysql: 'MySQL',
  mariadb: 'MariaDB',
  postgresql: 'PostgreSQL',
  sqlite: 'SQLite',
  mssql: 'TransactSQL',
  oracle: 'Oracle', // reserved for future enterprise support
};

export class AnalysisEngine {
  private readonly parser: Parser;
  private readonly rules: AnalysisRule[];

  constructor() {
    this.parser = new Parser();
    this.rules = [
      new SelectStarRule(),
      new MissingWhereRule(),
      new CartesianJoinRule(),
      new SubqueryOptimizationRule(),
      new UnsafePatternRule(),
      new OrderWithoutLimitRule(),
      new LeadingWildcardRule(),
      new GroupByInconsistencyRule(),
      new BroadTimeConditionRule(),
      new JoinOnNonIdRule(),
      new ContradictoryConditionsRule(),
    ];
  }

  /** Register additional rules at runtime */
  registerRule(rule: AnalysisRule): void {
    this.rules.push(rule);
  }

  /** Analyze a SQL query and return structured results */
  analyze(sql: string, dialect: string): AnalysisResult {
    const parserDialect = DIALECT_MAP[dialect] ?? 'MySQL';
    const trimmedSql = sql.trim();

    if (!trimmedSql) {
      return {
        success: false,
        dialect,
        originalQuery: sql,
        issues: [],
        ast: null,
        parsedSuccessfully: false,
        parseError: 'Empty query',
      };
    }

    let ast: unknown;
    try {
      ast = this.parser.astify(trimmedSql, { database: parserDialect });
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : String(parseError);
      return {
        success: true,
        dialect,
        originalQuery: sql,
        issues: [{
          ruleId: 'parse-error',
          severity: 'error',
          message: 'Failed to parse SQL query',
          explanation: `The query could not be parsed: ${message}. Check for syntax errors or unsupported SQL constructs for the ${dialect} dialect.`,
          suggestedRewrite: null,
          line: null,
          column: null,
        }],
        ast: null,
        parsedSuccessfully: false,
        parseError: message,
      };
    }

    /* Handle both single statements and arrays */
    const statements = Array.isArray(ast) ? ast : [ast];
    const allIssues = statements.flatMap((stmt) =>
      this.rules.flatMap((rule) => rule.analyze(stmt, trimmedSql)),
    );

    return {
      success: true,
      dialect,
      originalQuery: sql,
      issues: allIssues,
      ast,
      parsedSuccessfully: true,
      parseError: null,
    };
  }
}

/** Singleton engine instance */
export const analysisEngine = new AnalysisEngine();
