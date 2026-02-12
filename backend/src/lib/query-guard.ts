/**
 * Heuristic query guard — blocks dangerous SQL patterns before execution.
 *
 * Uses lightweight regex heuristics. No deep SQL parsing.
 * Strips comments before analysis to prevent bypass.
 *
 * Returns 422 QUERY_TOO_EXPENSIVE when a pattern is detected.
 */

export interface GuardResult {
  blocked: boolean;
  reason: string;
}

const PASS: GuardResult = { blocked: false, reason: '' };

/** Strip SQL comments (line and block) to prevent pattern bypass */
function stripComments(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, '')       // line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
    .trim();
}

/**
 * Check a SQL query against heuristic guards.
 * Call before execution to prevent heavy/recursive queries.
 */
export function guardQuery(sql: string): GuardResult {
  const clean = stripComments(sql);

  /* 1. WITH RECURSIVE — can loop forever */
  if (/\bWITH\s+RECURSIVE\b/i.test(clean)) {
    return { blocked: true, reason: 'WITH RECURSIVE queries are not allowed in sandbox execution' };
  }

  /* 2. CROSS JOIN without WHERE — cartesian explosion */
  if (/\bCROSS\s+JOIN\b/i.test(clean) && !/\bWHERE\b/i.test(clean)) {
    return { blocked: true, reason: 'CROSS JOIN without WHERE clause is not allowed' };
  }

  /* 3. SELECT * without WHERE and without LIMIT — unbounded result set */
  if (/\bSELECT\s+\*/i.test(clean) && !/\bWHERE\b/i.test(clean) && !/\bLIMIT\b/i.test(clean)) {
    return { blocked: true, reason: 'SELECT * without WHERE or LIMIT is not allowed' };
  }

  /* 4. generate_series / seq without LIMIT — unbounded row generation */
  if (/\bgenerate_series\b/i.test(clean) && !/\bLIMIT\b/i.test(clean)) {
    return { blocked: true, reason: 'generate_series without LIMIT is not allowed' };
  }

  /* 5. Multiple UNION (>2) without LIMIT — large combined result */
  const unionCount = (clean.match(/\bUNION\b/gi) ?? []).length;
  if (unionCount > 2 && !/\bLIMIT\b/i.test(clean)) {
    return { blocked: true, reason: 'Multiple UNION operations (>2) without LIMIT is not allowed' };
  }

  return PASS;
}
