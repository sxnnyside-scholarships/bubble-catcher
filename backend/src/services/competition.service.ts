import type {
  Challenge,
  ChallengeDifficulty,
  ChallengeLeaderboardEntry,
  ChallengeSubmission,
  CreateChallengePayload,
  EvaluateGolfResult,
  ExplainNode,
  GolfParStatus,
  SupportedDialect,
} from '@shared/types';
import { and, asc, eq, sql } from 'drizzle-orm';
import { analysisEngine } from '../analysis';
import { db } from '../db/client';
import { challengeSubmissionsTable, challengesTable, usersTable } from '../db/schema';
import { AppError } from '../lib/errors';
import { sandboxService } from '../sandbox';
import { explainParserService } from './explain-parser.service';
import { gradingEngine } from './grading.service';

export class CompetitionService {
  /**
   * Seed high-quality preloaded challenges if none exist
   */
  async seedDefaultChallenges(): Promise<void> {
    const existing = await db.select({ count: sql<number>`count(*)` }).from(challengesTable);
    const count = Number(existing[0]?.count || 0);
    if (count > 0) return;

    await db.insert(challengesTable).values([
      {
        title: 'The N+1 Order Buster',
        description:
          'A customer dashboard query is dragging down the database with massive table scans. Write an optimized query joining customers and orders that leverages indexes and avoids cartesian explosion.',
        dialect: 'postgresql',
        difficulty: 'medium',
        initialSchemaSql: `
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL,
  city VARCHAR(50)
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES customers(id),
  amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_orders_customer_date ON orders(customer_id, created_at);
CREATE INDEX idx_customers_status ON customers(status);

-- Seed 100 customers and 1000 orders
INSERT INTO customers (name, status, city)
SELECT 
  'Customer ' || i,
  CASE WHEN i % 3 = 0 THEN 'inactive' ELSE 'active' END,
  CASE WHEN i % 2 = 0 THEN 'CDMX' ELSE 'Guadalajara' END
FROM generate_series(1, 100) AS i;

INSERT INTO orders (customer_id, amount, created_at)
SELECT 
  (i % 100) + 1,
  ROUND((((i * 17) % 500) + 10)::numeric, 2),
  TIMESTAMP '2024-01-01' + ((i * 3) || ' hours')::interval
FROM generate_series(1, 1000) AS i;
`,
        referenceQuerySql: `
SELECT c.name, COUNT(o.id) AS order_count, ROUND(SUM(o.amount), 2) AS total_spent
FROM customers c
JOIN orders o ON c.id = o.customer_id
WHERE c.status = 'active'
  AND o.created_at >= '2024-01-05'
GROUP BY c.name
HAVING COUNT(o.id) >= 5
ORDER BY total_spent DESC
LIMIT 10;
`,
        targetExecutionTimeMs: 8.0,
        targetBuffersRead: 50,
      },
      {
        title: 'Wildcard Tamer',
        description:
          'The inventory team is running `LIKE %ELEC%` leading-wildcard queries that scan the entire catalog on every keystroke. Rewrite the query with sargable patterns using proper index prefix matching.',
        dialect: 'postgresql',
        difficulty: 'easy',
        initialSchemaSql: `
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  price NUMERIC(8,2) NOT NULL,
  in_stock BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_products_sku ON products(sku varchar_pattern_ops);
CREATE INDEX idx_products_in_stock ON products(in_stock);

INSERT INTO products (sku, name, category, price, in_stock)
SELECT 
  CASE 
    WHEN i % 3 = 0 THEN 'ELEC-' || LPAD(i::text, 5, '0')
    WHEN i % 3 = 1 THEN 'MECH-' || LPAD(i::text, 5, '0')
    ELSE 'CHEM-' || LPAD(i::text, 5, '0')
  END,
  'Item ' || i,
  CASE WHEN i % 2 = 0 THEN 'Electronics' ELSE 'Hardware' END,
  ROUND((((i * 23) % 200) + 15)::numeric, 2),
  (i % 4 != 0)
FROM generate_series(1, 600) AS i;
`,
        referenceQuerySql: `
SELECT id, sku, name, price
FROM products
WHERE sku LIKE 'ELEC-%'
  AND in_stock = true
ORDER BY price DESC
LIMIT 10;
`,
        targetExecutionTimeMs: 4.0,
        targetBuffersRead: 20,
      },
      {
        title: 'Keyset Pagination Sprint',
        description:
          'Deep pagination using `OFFSET 800` reads and throws away thousands of buffer blocks. Rewrite this pagination query using Keyset (Seek) Pagination to retrieve the next page with minimal buffer reads.',
        dialect: 'sqlite',
        difficulty: 'hard',
        initialSchemaSql: `
CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  recorded_at TEXT NOT NULL
);

CREATE INDEX idx_events_recorded_id ON events(recorded_at DESC, id DESC);

WITH RECURSIVE cnt(x) AS (
  SELECT 1
  UNION ALL
  SELECT x + 1 FROM cnt WHERE x < 500
)
INSERT INTO events (event_type, severity, recorded_at)
SELECT 
  CASE WHEN x % 3 = 0 THEN 'AUTH_FAILURE' ELSE 'API_REQUEST' END,
  CASE WHEN x % 5 = 0 THEN 'CRITICAL' ELSE 'INFO' END,
  datetime('2024-01-01 00:00:00', '+' || (x * 10) || ' minutes')
FROM cnt;
`,
        referenceQuerySql: `
SELECT id, event_type, severity, recorded_at
FROM events
WHERE recorded_at < '2024-01-03 00:00:00'
ORDER BY recorded_at DESC, id DESC
LIMIT 15;
`,
        targetExecutionTimeMs: 5.0,
        targetBuffersRead: 15,
      },
    ]);
  }

  /**
   * List all challenges with user progress metrics
   */
  async getChallenges(userId?: string): Promise<Challenge[]> {
    await this.seedDefaultChallenges();

    const challenges = await db
      .select()
      .from(challengesTable)
      .orderBy(asc(challengesTable.difficulty), asc(challengesTable.title));

    const result: Challenge[] = [];

    for (const ch of challenges) {
      let bestScore: number | null = null;
      let bestBuffers: number | null = null;
      let bestParStatus: GolfParStatus | null = null;

      if (userId) {
        const [bestSub] = await db
          .select({
            golfScore: challengeSubmissionsTable.golfScore,
            buffersRead: challengeSubmissionsTable.buffersRead,
            parStatus: challengeSubmissionsTable.parStatus,
          })
          .from(challengeSubmissionsTable)
          .where(
            and(
              eq(challengeSubmissionsTable.challengeId, ch.id),
              eq(challengeSubmissionsTable.userId, userId),
              eq(challengeSubmissionsTable.passed, true),
            ),
          )
          .orderBy(asc(challengeSubmissionsTable.buffersRead), asc(challengeSubmissionsTable.executionTimeMs))
          .limit(1);

        if (bestSub) {
          bestScore = bestSub.golfScore;
          bestBuffers = bestSub.buffersRead;
          bestParStatus = bestSub.parStatus as GolfParStatus;
        }
      }

      const [countRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(challengeSubmissionsTable)
        .where(eq(challengeSubmissionsTable.challengeId, ch.id));

      result.push({
        id: ch.id,
        title: ch.title,
        description: ch.description,
        dialect: ch.dialect as SupportedDialect,
        difficulty: ch.difficulty as ChallengeDifficulty,
        initialSchemaSql: ch.initialSchemaSql,
        referenceQuerySql: ch.referenceQuerySql,
        targetExecutionTimeMs: ch.targetExecutionTimeMs,
        targetBuffersRead: ch.targetBuffersRead,
        creatorId: ch.creatorId,
        createdAt: ch.createdAt.toISOString(),
        updatedAt: ch.updatedAt.toISOString(),
        bestScore,
        bestBuffers,
        bestParStatus,
        submissionCount: Number(countRow?.count || 0),
      });
    }

    return result;
  }

  /**
   * Get single challenge by ID
   */
  async getChallengeById(challengeId: string, userId?: string): Promise<Challenge> {
    const [ch] = await db.select().from(challengesTable).where(eq(challengesTable.id, challengeId));

    if (!ch) throw AppError.notFound('CHALLENGE_NOT_FOUND');

    let bestScore: number | null = null;
    let bestBuffers: number | null = null;
    let bestParStatus: GolfParStatus | null = null;

    if (userId) {
      const [bestSub] = await db
        .select({
          golfScore: challengeSubmissionsTable.golfScore,
          buffersRead: challengeSubmissionsTable.buffersRead,
          parStatus: challengeSubmissionsTable.parStatus,
        })
        .from(challengeSubmissionsTable)
        .where(
          and(
            eq(challengeSubmissionsTable.challengeId, ch.id),
            eq(challengeSubmissionsTable.userId, userId),
            eq(challengeSubmissionsTable.passed, true),
          ),
        )
        .orderBy(asc(challengeSubmissionsTable.buffersRead), asc(challengeSubmissionsTable.executionTimeMs))
        .limit(1);

      if (bestSub) {
        bestScore = bestSub.golfScore;
        bestBuffers = bestSub.buffersRead;
        bestParStatus = bestSub.parStatus as GolfParStatus;
      }
    }

    return {
      id: ch.id,
      title: ch.title,
      description: ch.description,
      dialect: ch.dialect as SupportedDialect,
      difficulty: ch.difficulty as ChallengeDifficulty,
      initialSchemaSql: ch.initialSchemaSql,
      referenceQuerySql: ch.referenceQuerySql,
      targetExecutionTimeMs: ch.targetExecutionTimeMs,
      targetBuffersRead: ch.targetBuffersRead,
      creatorId: ch.creatorId,
      createdAt: ch.createdAt.toISOString(),
      updatedAt: ch.updatedAt.toISOString(),
      bestScore,
      bestBuffers,
      bestParStatus,
    };
  }

  /**
   * Get Leaderboard for a challenge
   */
  async getLeaderboard(challengeId: string): Promise<ChallengeLeaderboardEntry[]> {
    const rows = await db
      .select({
        id: challengeSubmissionsTable.id,
        userId: challengeSubmissionsTable.userId,
        userName: usersTable.displayName,
        userEmail: usersTable.email,
        buffersRead: challengeSubmissionsTable.buffersRead,
        executionTimeMs: challengeSubmissionsTable.executionTimeMs,
        queryLength: challengeSubmissionsTable.queryLength,
        golfScore: challengeSubmissionsTable.golfScore,
        parStatus: challengeSubmissionsTable.parStatus,
        astIssuesCount: challengeSubmissionsTable.astIssuesCount,
        createdAt: challengeSubmissionsTable.createdAt,
      })
      .from(challengeSubmissionsTable)
      .leftJoin(usersTable, eq(challengeSubmissionsTable.userId, usersTable.id))
      .where(and(eq(challengeSubmissionsTable.challengeId, challengeId), eq(challengeSubmissionsTable.passed, true)))
      .orderBy(
        asc(challengeSubmissionsTable.buffersRead),
        asc(challengeSubmissionsTable.executionTimeMs),
        asc(challengeSubmissionsTable.queryLength),
      )
      .limit(50);

    // Keep best attempt per unique user
    const seenUsers = new Set<string>();
    const uniqueEntries: ChallengeLeaderboardEntry[] = [];
    let rank = 1;

    for (const r of rows) {
      if (seenUsers.has(r.userId)) continue;
      seenUsers.add(r.userId);

      uniqueEntries.push({
        rank: rank++,
        id: r.id,
        userId: r.userId,
        userName: r.userName || (r.userEmail ? r.userEmail.split('@')[0] : null) || 'Anonymous',
        userEmail: r.userEmail || '',
        buffersRead: r.buffersRead,
        executionTimeMs: r.executionTimeMs,
        queryLength: r.queryLength,
        golfScore: r.golfScore,
        parStatus: r.parStatus as GolfParStatus,
        astIssuesCount: r.astIssuesCount,
        createdAt: r.createdAt.toISOString(),
      });
    }

    return uniqueEntries;
  }

  /**
   * Evaluates student SQL for Golf performance against challenge targets
   */
  async evaluateQuery(challengeId: string, studentSql: string): Promise<EvaluateGolfResult> {
    if (!studentSql?.trim()) {
      throw AppError.badRequest('EMPTY_QUERY');
    }

    const challenge = await this.getChallengeById(challengeId);
    const cleanSql = studentSql.trim().replace(/;+$/, '');
    const queryLength = cleanSql.length;

    // 1. Run AST analysis for anti-patterns
    const astResult = analysisEngine.analyze(cleanSql, challenge.dialect);
    const astIssues = astResult.issues;

    // 2. Execute Reference Query in Sandbox with Initial Schema
    const refExec = await sandboxService.execute(challenge.referenceQuerySql, challenge.dialect, 10_000, {
      seedSql: challenge.initialSchemaSql,
    });

    // 3. Execute Student Query in Sandbox with Initial Schema
    const studentExec = await sandboxService.execute(cleanSql, challenge.dialect, 10_000, {
      seedSql: challenge.initialSchemaSql,
    });

    // 4. Check tuple equivalence
    const tupleCheck = gradingEngine.compareTuples(studentExec.rows, refExec.rows);
    const tupleMatch = tupleCheck.passed;

    // 5. Measure Buffers Read & Execution Time
    let buffersRead = 0;
    let executionTimeMs = studentExec.executionTimeMs;

    try {
      if (challenge.dialect === 'postgresql') {
        const explainExec = await sandboxService.execute(
          `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${cleanSql}`,
          'postgresql',
          10_000,
          { seedSql: challenge.initialSchemaSql },
        );
        if (explainExec.success && explainExec.rows && explainExec.rows.length > 0) {
          const rawExplain = (explainExec.rows as unknown[][]).map((r) => r.join('')).join('\n');
          const plan = explainParserService.parse(rawExplain, 'postgresql', studentExec.executionTimeMs);
          buffersRead = this.sumPlanBuffers(plan.root);
          if (plan.executionTimeMs > 0) {
            executionTimeMs = plan.executionTimeMs;
          }
        }
      } else {
        // For SQLite, estimate buffers based on query plan & row count
        const explainExec = await sandboxService.execute(`EXPLAIN QUERY PLAN ${cleanSql}`, challenge.dialect, 10_000, {
          seedSql: challenge.initialSchemaSql,
        });
        if (explainExec.success && explainExec.rows) {
          const rawPlan = (explainExec.rows as unknown[][]).map((r) => r.join(' ')).join('\n');
          const isTableScan = rawPlan.toLowerCase().includes('scan');
          const isIndexSeek = rawPlan.toLowerCase().includes('search') || rawPlan.toLowerCase().includes('index');

          if (isIndexSeek) {
            buffersRead = Math.max(3, Math.ceil(studentExec.rowCount ? studentExec.rowCount * 0.5 : 5));
          } else if (isTableScan) {
            buffersRead = Math.max(25, (studentExec.rowCount || 50) * 2);
          } else {
            buffersRead = 12;
          }
        }
      }
    } catch {
      buffersRead = challenge.targetBuffersRead;
    }

    if (buffersRead <= 0) {
      buffersRead = Math.max(2, Math.round(executionTimeMs * 3));
    }

    // 6. Compute Golf Par Status and Score
    const { parStatus, golfScore, feedback } = this.computeGolfScore({
      tupleMatch,
      buffersRead,
      targetBuffers: challenge.targetBuffersRead,
      executionTimeMs,
      targetTimeMs: challenge.targetExecutionTimeMs,
      astIssuesCount: astIssues.length,
      studentRowCount: studentExec.rowCount || 0,
      referenceRowCount: refExec.rowCount || 0,
    });

    return {
      passed: tupleMatch,
      tupleMatch,
      studentRowCount: studentExec.rowCount || 0,
      referenceRowCount: refExec.rowCount || 0,
      executionTimeMs,
      referenceTimeMs: refExec.executionTimeMs,
      targetTimeMs: challenge.targetExecutionTimeMs,
      buffersRead,
      targetBuffers: challenge.targetBuffersRead,
      queryLength,
      golfScore,
      parStatus,
      astIssues,
      feedback,
      sampleRows: studentExec.rows?.slice(0, 10),
      columns: studentExec.columns,
    };
  }

  /**
   * Dry-run query benchmark
   */
  async testQuery(_userId: string, challengeId: string, studentSql: string): Promise<EvaluateGolfResult> {
    const evalResult = await this.evaluateQuery(challengeId, studentSql);
    return evalResult;
  }

  /**
   * Official submission to leaderboard
   */
  async submitQuery(userId: string, challengeId: string, studentSql: string): Promise<EvaluateGolfResult> {
    const evalResult = await this.evaluateQuery(challengeId, studentSql);

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) throw AppError.notFound('USER_NOT_FOUND');

    const [row] = await db
      .insert(challengeSubmissionsTable)
      .values({
        challengeId,
        userId,
        sql: studentSql.trim(),
        passed: evalResult.passed,
        executionTimeMs: evalResult.executionTimeMs,
        buffersRead: evalResult.buffersRead,
        queryLength: evalResult.queryLength,
        golfScore: evalResult.golfScore,
        parStatus: evalResult.parStatus,
        astIssuesCount: evalResult.astIssues.length,
      })
      .returning();

    const submission: ChallengeSubmission = {
      id: row.id,
      challengeId: row.challengeId,
      userId: row.userId,
      userName: user.displayName || user.email.split('@')[0] || 'Student',
      userEmail: user.email,
      sql: row.sql,
      passed: row.passed,
      executionTimeMs: row.executionTimeMs,
      buffersRead: row.buffersRead,
      queryLength: row.queryLength,
      golfScore: row.golfScore,
      parStatus: row.parStatus as GolfParStatus,
      astIssuesCount: row.astIssuesCount,
      createdAt: row.createdAt.toISOString(),
    };

    return {
      ...evalResult,
      submission,
    };
  }

  /**
   * Create custom challenge (Teachers/Admins)
   */
  async createChallenge(creatorId: string, payload: CreateChallengePayload): Promise<Challenge> {
    const [row] = await db
      .insert(challengesTable)
      .values({
        title: payload.title.trim(),
        description: payload.description.trim(),
        dialect: payload.dialect,
        difficulty: payload.difficulty,
        initialSchemaSql: payload.initialSchemaSql.trim(),
        referenceQuerySql: payload.referenceQuerySql.trim(),
        targetExecutionTimeMs: payload.targetExecutionTimeMs || 10.0,
        targetBuffersRead: payload.targetBuffersRead || 50,
        creatorId,
      })
      .returning();

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      dialect: row.dialect as SupportedDialect,
      difficulty: row.difficulty as ChallengeDifficulty,
      initialSchemaSql: row.initialSchemaSql,
      referenceQuerySql: row.referenceQuerySql,
      targetExecutionTimeMs: row.targetExecutionTimeMs,
      targetBuffersRead: row.targetBuffersRead,
      creatorId: row.creatorId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /**
   * Helper: recursively sums buffer blocks accessed in an execution tree
   */
  private sumPlanBuffers(node: ExplainNode): number {
    let count = (node.buffersHit || 0) + (node.buffersRead || 0);
    for (const child of node.children) {
      count += this.sumPlanBuffers(child);
    }
    return count;
  }

  /**
   * Helper: calculates Golf score and Par rating
   */
  private computeGolfScore(params: {
    tupleMatch: boolean;
    buffersRead: number;
    targetBuffers: number;
    executionTimeMs: number;
    targetTimeMs: number;
    astIssuesCount: number;
    studentRowCount: number;
    referenceRowCount: number;
  }): { parStatus: GolfParStatus; golfScore: number; feedback: string } {
    const {
      tupleMatch,
      buffersRead,
      targetBuffers,
      executionTimeMs,
      targetTimeMs,
      astIssuesCount,
      studentRowCount,
      referenceRowCount,
    } = params;

    if (!tupleMatch) {
      return {
        parStatus: 'bogey',
        golfScore: 99,
        feedback: `Incorrect results: expected ${referenceRowCount} rows but received ${studentRowCount} rows. Output tuples must match reference query.`,
      };
    }

    const buffersRatio = buffersRead / targetBuffers;
    const timeRatio = executionTimeMs / targetTimeMs;

    if (buffersRatio <= 0.6 && timeRatio <= 0.9 && astIssuesCount === 0) {
      return {
        parStatus: 'hole_in_one',
        golfScore: -3,
        feedback: 'Hole in One! Phenomenal optimization: minimal buffers, blistering speed and perfectly clean AST.',
      };
    }

    if (buffersRatio <= 0.85 && timeRatio <= 1.0 && astIssuesCount === 0) {
      return {
        parStatus: 'eagle',
        golfScore: -2,
        feedback: 'Eagle! Outstanding efficiency well below the par buffer target with zero anti-patterns.',
      };
    }

    if (buffersRatio <= 1.0 && astIssuesCount === 0) {
      return {
        parStatus: 'birdie',
        golfScore: -1,
        feedback: 'Birdie! You beat the par target and your query plan is tight and optimal.',
      };
    }

    if (buffersRatio <= 1.25) {
      return {
        parStatus: 'par',
        golfScore: 0,
        feedback:
          'Par! You matched expected targets. Try refining join conditions or index seeks to shave more buffers.',
      };
    }

    const bogeyOver = Math.max(1, Math.ceil((buffersRead - targetBuffers) / 10));
    return {
      parStatus: 'bogey',
      golfScore: bogeyOver,
      feedback: `Bogey (+${bogeyOver}). High buffer I/O (${buffersRead} vs target ${targetBuffers}). Check for sequential scans or unindexed joins.`,
    };
  }
}

export const competitionService = new CompetitionService();
