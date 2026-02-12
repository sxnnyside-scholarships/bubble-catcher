import { Parser } from 'node-sql-parser';
import type { AnalysisResult, AnalysisIssue } from '@shared/types';
import type { AnalysisRule, PlanTier } from './rule.interface';
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
  /* Premium rules */
  MissingIndexHintRule,
  SelectDistinctMisuseRule,
  UnboundedInListRule,
  NPlusOnePatternRule,
  CountWithoutWhereRule,
  ImplicitTypeConversionRule,
} from './rules';

/** Plan tier hierarchy for comparison */
const PLAN_RANK: Record<PlanTier, number> = { free: 0, premium: 1, enterprise: 2 };

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
      /* Free rules */
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
      /* Premium rules */
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

  /** Analyze a SQL query and return structured results */
  analyze(sql: string, dialect: string, userPlan: PlanTier = 'free'): AnalysisResult {
    const parserDialect = DIALECT_MAP[dialect] ?? 'MySQL';
    const trimmedSql = sql.trim();
    const userRank = PLAN_RANK[userPlan] ?? 0;

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

    /* Run rules the user has access to */
    const accessibleRules = this.rules.filter((rule) => {
      const ruleRank = PLAN_RANK[rule.requiresPlan ?? 'free'];
      return ruleRank <= userRank;
    });

    const allIssues: AnalysisIssue[] = statements.flatMap((stmt) =>
      accessibleRules.flatMap((rule) => rule.analyze(stmt, trimmedSql)),
    );

    /* Collect locked rule IDs for frontend to show premium badges */
    const lockedRuleIds = this.rules
      .filter((rule) => {
        const ruleRank = PLAN_RANK[rule.requiresPlan ?? 'free'];
        return ruleRank > userRank;
      })
      .map((rule) => rule.id);

    return {
      success: true,
      dialect,
      originalQuery: sql,
      issues: allIssues,
      ast,
      parsedSuccessfully: true,
      parseError: null,
      lockedRuleIds,
    };
  }
}

/** Singleton engine instance */
export const analysisEngine = new AnalysisEngine();
