import { describe, expect, test } from 'bun:test';
import type { ExecutionResult } from '@shared/types';
import { GradingEngine } from '../services/grading.service';

describe('GradingEngine', () => {
  const engine = new GradingEngine();

  test('compareTuples returns match for identical rows in different order', () => {
    const student = [
      ['Alice', 25],
      ['Bob', 30],
    ];
    const reference = [
      ['Bob', 30],
      ['Alice', 25],
    ];
    const result = engine.compareTuples(student, reference);
    expect(result.passed).toBe(true);
    expect(result.matchRatio).toBe(1.0);
  });

  test('compareTuples detects missing rows', () => {
    const student = [['Alice', 25]];
    const reference = [
      ['Bob', 30],
      ['Alice', 25],
    ];
    const result = engine.compareTuples(student, reference);
    expect(result.passed).toBe(false);
    expect(result.matchRatio).toBe(0.5);
  });

  test('evaluate computes full score for matching query with clean AST', () => {
    const studentResult: ExecutionResult = {
      success: true,
      status: 'success',
      columns: ['name'],
      rows: [['Alice']],
      rowCount: 1,
      executionTimeMs: 40,
      executedAt: new Date().toISOString(),
    };

    const refResult: ExecutionResult = {
      success: true,
      status: 'success',
      columns: ['name'],
      rows: [['Alice']],
      rowCount: 1,
      executionTimeMs: 45,
      executedAt: new Date().toISOString(),
    };

    // Clean query without SELECT *
    const breakdown = engine.evaluate(
      'SELECT name FROM users WHERE id = 1;',
      'postgresql',
      studentResult,
      refResult,
      100,
    );
    expect(breakdown.tupleMatchPassed).toBe(true);
    expect(breakdown.astPassed).toBe(true);
    expect(breakdown.tupleMatchScore).toBe(60);
    expect(breakdown.astScore).toBe(25);
    expect(breakdown.performanceScore).toBe(15);
  });

  test('evaluate penalizes anti-pattern like SELECT * without WHERE', () => {
    const studentResult: ExecutionResult = {
      success: true,
      status: 'success',
      columns: ['id', 'name'],
      rows: [[1, 'Alice']],
      rowCount: 1,
      executionTimeMs: 50,
      executedAt: new Date().toISOString(),
    };

    const refResult: ExecutionResult = {
      success: true,
      status: 'success',
      columns: ['id', 'name'],
      rows: [[1, 'Alice']],
      rowCount: 1,
      executionTimeMs: 45,
      executedAt: new Date().toISOString(),
    };

    // Query violating SELECT * and MISSING WHERE
    const breakdown = engine.evaluate('SELECT * FROM users;', 'postgresql', studentResult, refResult, 100);
    expect(breakdown.tupleMatchPassed).toBe(true);
    expect(breakdown.astPassed).toBe(false);
    expect(breakdown.astIssues.length).toBeGreaterThan(0);
    expect(breakdown.astScore).toBeLessThan(25);
  });
});
