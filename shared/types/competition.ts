import type { AnalysisIssue } from './analysis';
import type { SupportedDialect } from './dialect';

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';

export type GolfParStatus = 'hole_in_one' | 'eagle' | 'birdie' | 'par' | 'bogey';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  dialect: SupportedDialect;
  difficulty: ChallengeDifficulty;
  initialSchemaSql: string;
  referenceQuerySql: string;
  targetExecutionTimeMs: number;
  targetBuffersRead: number;
  creatorId: string | null;
  createdAt: string;
  updatedAt: string;
  bestScore?: number | null;
  bestBuffers?: number | null;
  bestParStatus?: GolfParStatus | null;
  submissionCount?: number;
}

export interface ChallengeSubmission {
  id: string;
  challengeId: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  sql: string;
  passed: boolean;
  executionTimeMs: number;
  buffersRead: number;
  queryLength: number;
  golfScore: number;
  parStatus: GolfParStatus;
  astIssuesCount: number;
  createdAt: string;
}

export interface ChallengeLeaderboardEntry {
  rank: number;
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  buffersRead: number;
  executionTimeMs: number;
  queryLength: number;
  golfScore: number;
  parStatus: GolfParStatus;
  astIssuesCount: number;
  createdAt: string;
}

export interface EvaluateGolfResult {
  passed: boolean;
  tupleMatch: boolean;
  studentRowCount: number;
  referenceRowCount: number;
  executionTimeMs: number;
  referenceTimeMs: number;
  targetTimeMs: number;
  buffersRead: number;
  targetBuffers: number;
  queryLength: number;
  golfScore: number;
  parStatus: GolfParStatus;
  astIssues: AnalysisIssue[];
  feedback: string;
  sampleRows?: unknown[][];
  columns?: string[];
  submission?: ChallengeSubmission;
}

export interface CreateChallengePayload {
  title: string;
  description: string;
  dialect: SupportedDialect;
  difficulty: ChallengeDifficulty;
  initialSchemaSql: string;
  referenceQuerySql: string;
  targetExecutionTimeMs: number;
  targetBuffersRead: number;
}
