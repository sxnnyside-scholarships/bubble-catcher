import type { AnalysisIssue, AnalysisResult, Dialect } from '@shared/types';
import { Parser } from 'node-sql-parser';
import type { AnalysisRule } from './rule.interface';
import {
  BroadTimeConditionRule,
  CartesianJoinRule,
  ContradictoryConditionsRule,
  CountWithoutWhereRule,
  GroupByInconsistencyRule,
  ImplicitTypeConversionRule,
  JoinOnNonIdRule,
  LeadingWildcardRule,
  MissingIndexHintRule,
  MissingWhereRule,
  NPlusOnePatternRule,
  OrderWithoutLimitRule,
  SelectDistinctMisuseRule,
  SelectStarRule,
  SubqueryOptimizationRule,
  UnboundedInListRule,
  UnsafePatternRule,
} from './rules';

/** Maps our dialect names to node-sql-parser database values */
const DIALECT_MAP: Record<string, string> = {
  mysql: 'MySQL',
  mariadb: 'MariaDB',
  postgresql: 'PostgreSQL',
  sqlite: 'SQLite',
  libsql: 'SQLite',
  mssql: 'TransactSQL',
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
      new MissingIndexHintRule(),
      new SelectDistinctMisuseRule(),
      new UnboundedInListRule(),
      new NPlusOnePatternRule(),
      new CountWithoutWhereRule(),
      new ImplicitTypeConversionRule(),
    ];
  }

  /** Register additional rules at runtime */
  registerRule(rule: AnalysisRule): void {
    this.rules.push(rule);
  }

  /**
   * Parse SQL into an AST once. Reused by the analysis engine and, where
   * applicable, by the query guard — avoids parsing the same query twice.
   */
  parse(sql: string, dialect: Dialect): { ast: unknown; error: string | null } {
    const parserDialect = DIALECT_MAP[dialect] ?? 'MySQL';
    try {
      return { ast: this.parser.astify(sql, { database: parserDialect }), error: null };
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : String(parseError);
      return { ast: null, error: message };
    }
  }

  /** Analyze a SQL query and return structured results */
  analyze(sql: string, dialect: Dialect): AnalysisResult {
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

    const { ast, error: parseError } = this.parse(trimmedSql, dialect);

    if (parseError || ast == null) {
      return {
        success: true,
        dialect,
        originalQuery: sql,
        issues: [
          {
            ruleId: 'parse-error',
            severity: 'error',
            message: 'Failed to parse SQL query',
            explanation: `The query could not be parsed: ${parseError}. Check for syntax errors or unsupported SQL constructs for the ${dialect} dialect.`,
            suggestedRewrite: null,
            line: null,
            column: null,
          },
        ],
        ast: null,
        parsedSuccessfully: false,
        parseError,
      };
    }

    /* Handle both single statements and arrays */
    const statements = Array.isArray(ast) ? ast : [ast];

    const allIssues: AnalysisIssue[] = statements.flatMap((stmt) =>
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
