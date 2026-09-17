/** Structural query guard — inspects the AST (not a string regex) to block dangerous SQL patterns before execution. */
import { Parser } from 'node-sql-parser';

export interface GuardResult {
  blocked: boolean;
  reason: string;
}

const PASS: GuardResult = { blocked: false, reason: '' };

const DIALECT_MAP: Record<string, string> = {
  mysql: 'MySQL',
  mariadb: 'MariaDB',
  postgresql: 'PostgreSQL',
  sqlite: 'SQLite',
  libsql: 'SQLite',
  mssql: 'TransactSQL',
};

const parser = new Parser();

/** Walk an AST node looking for a `with`/CTE clause where any CTE is recursive. */
function hasRecursiveCte(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false;
  const rec = node as Record<string, unknown>;

  if (Array.isArray(rec['with'])) {
    for (const cte of rec['with'] as unknown[]) {
      const cteRec = cte as Record<string, unknown>;
      if (cteRec['recursive']) return true;
    }
  }
  return false;
}

/** Counts CROSS JOINs across the `from` clause that have no explicit `on`/`where` condition. */
function hasUnfilteredCrossJoin(stmt: Record<string, unknown>): boolean {
  const from = stmt['from'];
  if (!Array.isArray(from)) return false;

  const hasCrossJoin = from.some((f) => {
    const fRec = f as Record<string, unknown>;
    return typeof fRec['join'] === 'string' && /cross\s*join/i.test(fRec['join'] as string) && !fRec['on'];
  });

  return hasCrossJoin && !stmt['where'];
}

/** node-sql-parser sets `limit` to `{ value: [] }`, never null, when absent — check `value.length`, not truthiness. */
function hasLimitClause(stmt: Record<string, unknown>): boolean {
  const limit = stmt['limit'] as { value?: unknown[] } | null | undefined;
  return Array.isArray(limit?.value) && limit.value.length > 0;
}

function isSelectStarWithoutBounds(stmt: Record<string, unknown>): boolean {
  const columns = stmt['columns'];
  const isStar =
    columns === '*' ||
    (Array.isArray(columns) &&
      columns.some((c) => {
        const col = (c as Record<string, unknown>)?.['expr'] as Record<string, unknown> | undefined;
        return col?.['type'] === 'star' || col?.['column'] === '*';
      }));

  if (!isStar) return false;
  return !stmt['where'] && !hasLimitClause(stmt);
}

/** Count UNION-linked statements by walking the `_next` chain node-sql-parser produces. */
function countUnions(stmt: Record<string, unknown>): number {
  let count = 0;
  let current: Record<string, unknown> | undefined = stmt;
  while (current && typeof current['_next'] === 'object') {
    if (typeof current['union'] === 'string') count++;
    current = current['_next'] as Record<string, unknown>;
  }
  return count;
}

function containsUnboundedGenerateSeries(stmt: Record<string, unknown>): boolean {
  const raw = JSON.stringify(stmt).toLowerCase();
  return raw.includes('generate_series') && !hasLimitClause(stmt);
}

/** Check a SQL query against structural guards. Call before execution. */
export function guardQuery(sql: string, dialect: string): GuardResult {
  const parserDialect = DIALECT_MAP[dialect] ?? 'MySQL';

  let ast: unknown;
  try {
    ast = parser.astify(sql, { database: parserDialect });
  } catch {
    /* Unparseable SQL is not safe to run — the analysis engine reports the
     * syntax error separately; the sandbox just declines to execute it. */
    return { blocked: true, reason: 'Query could not be parsed and cannot be safely evaluated for sandbox execution' };
  }

  const statements = Array.isArray(ast) ? ast : [ast];

  for (const stmt of statements) {
    const rec = stmt as Record<string, unknown>;

    if (hasRecursiveCte(rec)) {
      return { blocked: true, reason: 'Recursive CTEs (WITH RECURSIVE) are not allowed in sandbox execution' };
    }

    if (hasUnfilteredCrossJoin(rec)) {
      return { blocked: true, reason: 'CROSS JOIN without a WHERE/ON condition is not allowed' };
    }

    if (isSelectStarWithoutBounds(rec)) {
      return { blocked: true, reason: 'SELECT * without WHERE or LIMIT is not allowed' };
    }

    if (containsUnboundedGenerateSeries(rec)) {
      return { blocked: true, reason: 'generate_series without LIMIT is not allowed' };
    }

    if (countUnions(rec) > 2 && !hasLimitClause(rec)) {
      return { blocked: true, reason: 'Multiple UNION operations (>2) without LIMIT is not allowed' };
    }
  }

  return PASS;
}
