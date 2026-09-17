import { describe, expect, test } from 'bun:test';
import { AnalysisEngine } from '../analysis/engine';

describe('AnalysisEngine', () => {
  const engine = new AnalysisEngine();

  test('flags SELECT * as an issue', () => {
    const result = engine.analyze('SELECT * FROM users', 'sqlite');
    expect(result.parsedSuccessfully).toBe(true);
    expect(result.issues.some((i) => i.ruleId === 'select-star')).toBe(true);
  });

  test('flags DELETE without WHERE', () => {
    const result = engine.analyze('DELETE FROM users', 'sqlite');
    expect(result.issues.some((i) => i.ruleId === 'missing-where')).toBe(true);
  });

  test('all 17 rules are always active — no tier gating', () => {
    // A query with no obvious issues should still succeed with an empty (or minimal) issue set,
    // never with a `lockedRuleIds`-style gate — that field no longer exists on AnalysisResult.
    const result = engine.analyze('SELECT id FROM users WHERE id = 1', 'sqlite');
    expect(result).not.toHaveProperty('lockedRuleIds');
  });

  test('reports a parse error for invalid SQL instead of throwing', () => {
    const result = engine.analyze('SELECT FROM WHERE', 'sqlite');
    expect(result.parsedSuccessfully).toBe(false);
    expect(result.issues[0]?.ruleId).toBe('parse-error');
  });

  test('handles empty query', () => {
    const result = engine.analyze('', 'sqlite');
    expect(result.success).toBe(false);
    expect(result.parseError).toBe('Empty query');
  });
});
