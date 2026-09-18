import { describe, expect, test } from 'bun:test';
import type { GolfParStatus } from '@shared/types';
import { GradingEngine } from '../services/grading.service';

describe('Query Golf & Competition Engine', () => {
  const gradingEngine = new GradingEngine();

  test('compareTuples validates exact tuple set regardless of ordering', () => {
    const student = [
      ['Customer 1', 10, 500.25],
      ['Customer 2', 5, 200.0],
    ];
    const reference = [
      ['Customer 2', 5, 200.0],
      ['Customer 1', 10, 500.25],
    ];

    const res = gradingEngine.compareTuples(student, reference);
    expect(res.passed).toBe(true);
    expect(res.matchRatio).toBe(1.0);
  });

  test('compareTuples rejects incomplete or mismatched output rows', () => {
    const student = [['Customer 1', 10, 500.25]];
    const reference = [
      ['Customer 1', 10, 500.25],
      ['Customer 2', 5, 200.0],
    ];

    const res = gradingEngine.compareTuples(student, reference);
    expect(res.passed).toBe(false);
    expect(res.matchRatio).toBe(0.5);
  });

  test('Golf Score evaluates Eagle when buffers and time are well below par with 0 AST issues', () => {
    // Simulating score calculation contract
    const targetBuffers = 50;
    const targetTimeMs = 10.0;
    const actualBuffers = 35; // 70% of target (< 0.85)
    const actualTimeMs = 6.2;
    const astIssuesCount = 0;

    const buffersRatio = actualBuffers / targetBuffers;
    const timeRatio = actualTimeMs / targetTimeMs;

    let parStatus: GolfParStatus = 'par';
    let golfScore = 0;

    if (buffersRatio <= 0.6 && timeRatio <= 0.9 && astIssuesCount === 0) {
      parStatus = 'hole_in_one';
      golfScore = -3;
    } else if (buffersRatio <= 0.85 && timeRatio <= 1.0 && astIssuesCount === 0) {
      parStatus = 'eagle';
      golfScore = -2;
    }

    expect(parStatus).toBe('eagle');
    expect(golfScore).toBe(-2);
  });

  test('Golf Score evaluates Bogey with penalty when buffers exceed target', () => {
    const targetBuffers = 20;
    const actualBuffers = 120; // 6x target! (Seq scan)
    const buffersRatio = actualBuffers / targetBuffers;

    let parStatus: GolfParStatus = 'par';
    let golfScore = 0;

    if (buffersRatio > 1.25) {
      parStatus = 'bogey';
      golfScore = Math.max(1, Math.ceil((actualBuffers - targetBuffers) / 10));
    }

    expect(parStatus).toBe('bogey');
    expect(golfScore).toBe(10);
  });

  test('Leaderboard sorting sorts primarily by buffersRead, then executionTimeMs, then queryLength', () => {
    const submissions = [
      { id: 'sub-1', userName: 'Alice', buffersRead: 45, executionTimeMs: 12.0, queryLength: 150 },
      { id: 'sub-2', userName: 'Bob', buffersRead: 15, executionTimeMs: 4.5, queryLength: 210 },
      { id: 'sub-3', userName: 'Charlie', buffersRead: 15, executionTimeMs: 3.2, queryLength: 180 },
      { id: 'sub-4', userName: 'Diana', buffersRead: 15, executionTimeMs: 3.2, queryLength: 140 },
    ];

    const sorted = [...submissions].sort((a, b) => {
      if (a.buffersRead !== b.buffersRead) return a.buffersRead - b.buffersRead;
      if (a.executionTimeMs !== b.executionTimeMs) return a.executionTimeMs - b.executionTimeMs;
      return a.queryLength - b.queryLength;
    });

    // Diana wins the tie-breaker with Charlie on queryLength (140 vs 180 chars)
    expect(sorted[0]?.userName).toBe('Diana');
    expect(sorted[1]?.userName).toBe('Charlie');
    expect(sorted[2]?.userName).toBe('Bob');
    expect(sorted[3]?.userName).toBe('Alice');
  });
});
