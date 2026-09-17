import type { AnalysisIssue } from './analysis';
import type { SupportedDialect } from './dialect';
import type { ExecutionResult } from './execution';

export interface Course {
  id: string;
  teacherId: string;
  title: string;
  description: string;
  joinCode: string;
  createdAt: string;
  updatedAt: string;
  teacherName?: string | null;
  studentCount?: number;
  assignmentCount?: number;
}

export interface CourseEnrollment {
  id: string;
  courseId: string;
  studentId: string;
  studentName: string | null;
  studentEmail: string;
  joinedAt: string;
}

export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  description: string;
  dialect: SupportedDialect;
  initialSchemaSql: string;
  referenceQuerySql: string;
  maxScore: number;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GradeBreakdown {
  tupleMatchScore: number;
  tupleMatchMax: number;
  tupleMatchPassed: boolean;
  astScore: number;
  astMax: number;
  astPassed: boolean;
  astIssues: AnalysisIssue[];
  performanceScore: number;
  performanceMax: number;
  executionTimeMs: number;
  referenceTimeMs: number;
  studentRowCount: number;
  referenceRowCount: number;
  summaryFeedback: string;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName?: string | null;
  studentEmail?: string;
  submittedSql: string;
  score: number;
  passed: boolean;
  tupleMatchPassed: boolean;
  astViolationsCount: number;
  executionTimeMs: number;
  feedback: GradeBreakdown;
  createdAt: string;
}

export interface CreateCoursePayload {
  title: string;
  description?: string;
}

export interface JoinCoursePayload {
  joinCode: string;
}

export interface CreateAssignmentPayload {
  title: string;
  description: string;
  dialect: SupportedDialect;
  initialSchemaSql: string;
  referenceQuerySql: string;
  maxScore?: number;
  dueDate?: string | null;
}

export interface TestQueryPayload {
  sql: string;
}

export interface SubmitAssignmentPayload {
  sql: string;
}

export interface TestEvaluationResult {
  execution: ExecutionResult;
  referenceExecution: ExecutionResult | null;
  gradeBreakdown: GradeBreakdown;
}
