import type { AnalysisIssue, AnalysisResult, ExecutionResult, GradeBreakdown, SupportedDialect } from '@shared/types';
import { analysisEngine } from '../analysis';

export class GradingEngine {
  /**
   * Normalizes a cell value for equality checking (handling number coercion, date formats, nulls)
   */
  private normalizeCell(val: unknown): string {
    if (val === null || val === undefined) return '__NULL__';
    if (typeof val === 'number') return Number(val).toString();
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    return String(val).trim();
  }

  /**
   * Compares student rows against reference rows.
   * Tolerant to row ordering if the query didn't mandate ORDER BY,
   * but checks tuple cardinality and values.
   */
  compareTuples(
    studentRows: unknown[][] | undefined,
    referenceRows: unknown[][] | undefined,
  ): { passed: boolean; matchRatio: number } {
    const sRows = studentRows || [];
    const rRows = referenceRows || [];

    if (rRows.length === 0 && sRows.length === 0) {
      return { passed: true, matchRatio: 1.0 };
    }
    if (rRows.length === 0 || sRows.length === 0) {
      return { passed: false, matchRatio: 0.0 };
    }

    // Convert rows to canonical string representation
    const serializeRow = (row: unknown[]) => row.map((cell) => this.normalizeCell(cell)).join('|||');

    const sStrings = sRows.map(serializeRow);
    const rStrings = rRows.map(serializeRow);

    // Build frequency maps
    const rCounts = new Map<string, number>();
    for (const r of rStrings) {
      rCounts.set(r, (rCounts.get(r) || 0) + 1);
    }

    let matches = 0;
    const sRemainingCounts = new Map<string, number>();
    for (const s of sStrings) {
      sRemainingCounts.set(s, (sRemainingCounts.get(s) || 0) + 1);
    }

    for (const [rowKey, count] of sRemainingCounts.entries()) {
      const rCount = rCounts.get(rowKey) || 0;
      matches += Math.min(count, rCount);
    }

    const totalPossible = Math.max(sRows.length, rRows.length);
    const matchRatio = totalPossible > 0 ? matches / totalPossible : 0;
    const passed = matchRatio === 1.0 && sRows.length === rRows.length;

    return { passed, matchRatio };
  }

  /**
   * Evaluates a student query against an assignment
   */
  evaluate(
    studentSql: string,
    dialect: SupportedDialect,
    studentResult: ExecutionResult,
    referenceResult: ExecutionResult | null,
    maxScore = 100,
  ): GradeBreakdown {
    // 1. Static AST Analysis
    let astIssues: AnalysisIssue[] = [];
    try {
      const analysis: AnalysisResult = analysisEngine.analyze(studentSql, dialect);
      astIssues = analysis.issues;
    } catch {
      // If parsing fails completely, it will reflect in AST issues
      astIssues = [
        {
          ruleId: 'parse-error',
          severity: 'error',
          message: 'Syntax error encountered during AST analysis',
          explanation: 'The query could not be parsed by the AST inspection engine.',
          suggestedRewrite: null,
          line: null,
          column: null,
        },
      ];
    }

    // 2. Tuple Match Verification
    let tuplePassed = false;
    let matchRatio = 0;
    if (studentResult.success && referenceResult?.success) {
      const tupleCheck = this.compareTuples(studentResult.rows, referenceResult.rows);
      tuplePassed = tupleCheck.passed;
      matchRatio = tupleCheck.matchRatio;
    } else if (studentResult.success && !referenceResult) {
      // If no reference query was defined by instructor, execution success grants match
      tuplePassed = true;
      matchRatio = 1.0;
    }

    // 3. Performance Metric
    const sTime = studentResult.executionTimeMs || 0;
    const rTime = referenceResult?.executionTimeMs || Math.max(sTime, 10);
    // Performance score: max points if within 2.5x reference time, degrading gradually
    let perfRatio = 1.0;
    if (sTime > rTime * 2.5) {
      perfRatio = Math.max(0.2, 1.0 - (sTime - rTime * 2.5) / 1000);
    }

    // 4. Weight Distribution:
    // 60% Tuple correctness, 25% AST cleanliness, 15% Performance
    const tupleMax = Math.round(maxScore * 0.6);
    const astMax = Math.round(maxScore * 0.25);
    const perfMax = maxScore - tupleMax - astMax;

    const tupleScore = Math.round(tupleMax * matchRatio);

    // AST Penalties: 5 points per error/critical issue, 2 points per warning
    let astPenalties = 0;
    for (const issue of astIssues) {
      if (issue.severity === 'critical' || issue.severity === 'error') {
        astPenalties += 8;
      } else if (issue.severity === 'warning') {
        astPenalties += 4;
      }
    }
    const astScore = Math.max(0, astMax - astPenalties);
    const astPassed = !astIssues.some(
      (i) => i.severity === 'warning' || i.severity === 'error' || i.severity === 'critical',
    );

    const perfScore = studentResult.success ? Math.round(perfMax * perfRatio) : 0;

    const feedbackParts: string[] = [];
    if (tuplePassed) {
      feedbackParts.push('Tuples match teacher reference perfectly.');
    } else {
      feedbackParts.push(`Result set mismatch (${Math.round(matchRatio * 100)}% accuracy).`);
    }

    if (astPassed) {
      feedbackParts.push('AST validation passed with 0 anti-patterns.');
    } else {
      feedbackParts.push(`AST detected ${astIssues.length} anti-pattern(s) that must be optimized.`);
    }

    if (studentResult.success) {
      feedbackParts.push(`Execution completed in ${sTime}ms.`);
    } else {
      feedbackParts.push(`Query failed: ${studentResult.error?.message || 'Execution error'}`);
    }

    return {
      tupleMatchScore: tupleScore,
      tupleMatchMax: tupleMax,
      tupleMatchPassed: tuplePassed,
      astScore,
      astMax,
      astPassed,
      astIssues,
      performanceScore: perfScore,
      performanceMax: perfMax,
      executionTimeMs: sTime,
      referenceTimeMs: rTime,
      studentRowCount: studentResult.rowCount || 0,
      referenceRowCount: referenceResult?.rowCount || 0,
      summaryFeedback: feedbackParts.join(' '),
    };
  }
}

export const gradingEngine = new GradingEngine();
