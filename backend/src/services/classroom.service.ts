import type {
  Assignment,
  AssignmentSubmission,
  Course,
  CreateAssignmentPayload,
  CreateCoursePayload,
  GradeBreakdown,
  JoinCoursePayload,
  TestEvaluationResult,
} from '@shared/types';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import {
  assignmentSubmissionsTable,
  assignmentsTable,
  courseEnrollmentsTable,
  coursesTable,
  usersTable,
} from '../db/schema';
import { notDeleted } from '../db/soft-delete';
import { AppError } from '../lib/errors';
import { sandboxService } from '../sandbox';
import { gradingEngine } from './grading.service';

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export class ClassroomService {
  /** Create a course (admin / teacher) */
  async createCourse(teacherId: string, payload: CreateCoursePayload): Promise<Course> {
    const joinCode = generateJoinCode();
    const [row] = await db
      .insert(coursesTable)
      .values({
        teacherId,
        title: payload.title.trim(),
        description: (payload.description || '').trim(),
        joinCode,
      })
      .returning();

    return {
      id: row.id,
      teacherId: row.teacherId,
      title: row.title,
      description: row.description,
      joinCode: row.joinCode,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** List courses accessible to user (either teacher or enrolled student) */
  async listCourses(userId: string, isTeacher: boolean): Promise<Course[]> {
    if (isTeacher) {
      const courses = await db
        .select({
          id: coursesTable.id,
          teacherId: coursesTable.teacherId,
          title: coursesTable.title,
          description: coursesTable.description,
          joinCode: coursesTable.joinCode,
          createdAt: coursesTable.createdAt,
          updatedAt: coursesTable.updatedAt,
          teacherName: usersTable.displayName,
        })
        .from(coursesTable)
        .leftJoin(usersTable, eq(coursesTable.teacherId, usersTable.id))
        .where(and(eq(coursesTable.teacherId, userId), notDeleted(coursesTable.deletedAt)))
        .orderBy(desc(coursesTable.createdAt));

      return courses.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      }));
    }

    // Student: get courses enrolled in
    const enrollments = await db
      .select({
        id: coursesTable.id,
        teacherId: coursesTable.teacherId,
        title: coursesTable.title,
        description: coursesTable.description,
        joinCode: coursesTable.joinCode,
        createdAt: coursesTable.createdAt,
        updatedAt: coursesTable.updatedAt,
        teacherName: usersTable.displayName,
      })
      .from(courseEnrollmentsTable)
      .innerJoin(coursesTable, eq(courseEnrollmentsTable.courseId, coursesTable.id))
      .leftJoin(usersTable, eq(coursesTable.teacherId, usersTable.id))
      .where(and(eq(courseEnrollmentsTable.studentId, userId), notDeleted(coursesTable.deletedAt)))
      .orderBy(desc(courseEnrollmentsTable.joinedAt));

    return enrollments.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  /** Join course by code */
  async joinCourse(studentId: string, payload: JoinCoursePayload): Promise<Course> {
    const code = payload.joinCode.trim().toUpperCase();
    const [course] = await db
      .select()
      .from(coursesTable)
      .where(and(eq(coursesTable.joinCode, code), notDeleted(coursesTable.deletedAt)));

    if (!course) {
      throw AppError.notFound('COURSE_NOT_FOUND');
    }

    // Check if already enrolled
    const [existing] = await db
      .select()
      .from(courseEnrollmentsTable)
      .where(and(eq(courseEnrollmentsTable.courseId, course.id), eq(courseEnrollmentsTable.studentId, studentId)));

    if (!existing) {
      await db.insert(courseEnrollmentsTable).values({
        courseId: course.id,
        studentId,
      });
    }

    return {
      id: course.id,
      teacherId: course.teacherId,
      title: course.title,
      description: course.description,
      joinCode: course.joinCode,
      createdAt: course.createdAt.toISOString(),
      updatedAt: course.updatedAt.toISOString(),
    };
  }

  /** Get single course details */
  async getCourse(courseId: string): Promise<Course> {
    const [course] = await db
      .select({
        id: coursesTable.id,
        teacherId: coursesTable.teacherId,
        title: coursesTable.title,
        description: coursesTable.description,
        joinCode: coursesTable.joinCode,
        createdAt: coursesTable.createdAt,
        updatedAt: coursesTable.updatedAt,
        teacherName: usersTable.displayName,
      })
      .from(coursesTable)
      .leftJoin(usersTable, eq(coursesTable.teacherId, usersTable.id))
      .where(and(eq(coursesTable.id, courseId), notDeleted(coursesTable.deletedAt)));

    if (!course) throw AppError.notFound('COURSE_NOT_FOUND');

    return {
      ...course,
      createdAt: course.createdAt.toISOString(),
      updatedAt: course.updatedAt.toISOString(),
    };
  }

  /** Create assignment for course */
  async createAssignment(teacherId: string, courseId: string, payload: CreateAssignmentPayload): Promise<Assignment> {
    const [course] = await db
      .select()
      .from(coursesTable)
      .where(
        and(eq(coursesTable.id, courseId), eq(coursesTable.teacherId, teacherId), notDeleted(coursesTable.deletedAt)),
      );

    if (!course) throw AppError.forbidden('FORBIDDEN', { message: 'You do not own this course.' });

    const [row] = await db
      .insert(assignmentsTable)
      .values({
        courseId,
        title: payload.title.trim(),
        description: payload.description.trim(),
        dialect: payload.dialect,
        initialSchemaSql: payload.initialSchemaSql.trim(),
        referenceQuerySql: payload.referenceQuerySql.trim(),
        maxScore: payload.maxScore || 100,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
      })
      .returning();

    return {
      id: row.id,
      courseId: row.courseId,
      title: row.title,
      description: row.description,
      dialect: row.dialect,
      initialSchemaSql: row.initialSchemaSql,
      referenceQuerySql: row.referenceQuerySql,
      maxScore: row.maxScore,
      dueDate: row.dueDate ? row.dueDate.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** List assignments for a course */
  async listAssignments(courseId: string): Promise<Assignment[]> {
    const rows = await db
      .select()
      .from(assignmentsTable)
      .where(and(eq(assignmentsTable.courseId, courseId), notDeleted(assignmentsTable.deletedAt)))
      .orderBy(desc(assignmentsTable.createdAt));

    return rows.map((r) => ({
      id: r.id,
      courseId: r.courseId,
      title: r.title,
      description: r.description,
      dialect: r.dialect,
      initialSchemaSql: r.initialSchemaSql,
      referenceQuerySql: r.referenceQuerySql,
      maxScore: r.maxScore,
      dueDate: r.dueDate ? r.dueDate.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  /** Get assignment details */
  async getAssignment(assignmentId: string): Promise<Assignment> {
    const [row] = await db
      .select()
      .from(assignmentsTable)
      .where(and(eq(assignmentsTable.id, assignmentId), notDeleted(assignmentsTable.deletedAt)));

    if (!row) throw AppError.notFound('ASSIGNMENT_NOT_FOUND');

    return {
      id: row.id,
      courseId: row.courseId,
      title: row.title,
      description: row.description,
      dialect: row.dialect,
      initialSchemaSql: row.initialSchemaSql,
      referenceQuerySql: row.referenceQuerySql,
      maxScore: row.maxScore,
      dueDate: row.dueDate ? row.dueDate.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** Test student query without recording permanent submission (dry-run evaluation) */
  async testQuery(_studentId: string, assignmentId: string, studentSql: string): Promise<TestEvaluationResult> {
    const assignment = await this.getAssignment(assignmentId);

    // 1. Run student query against the preloaded schema
    const studentExec = await sandboxService.execute(studentSql, assignment.dialect, 10_000, {
      seedSql: assignment.initialSchemaSql,
    });

    // 2. Run reference query if provided
    let refExec = null;
    if (assignment.referenceQuerySql && assignment.referenceQuerySql.trim()) {
      refExec = await sandboxService.execute(assignment.referenceQuerySql, assignment.dialect, 10_000, {
        seedSql: assignment.initialSchemaSql,
      });
    }

    // 3. Compute evaluation breakdown
    const breakdown = gradingEngine.evaluate(studentSql, assignment.dialect, studentExec, refExec, assignment.maxScore);

    return {
      execution: studentExec,
      referenceExecution: refExec,
      gradeBreakdown: breakdown,
    };
  }

  /** Submit assignment for official grading and store record */
  async submitAssignment(studentId: string, assignmentId: string, studentSql: string): Promise<AssignmentSubmission> {
    const evalResult = await this.testQuery(studentId, assignmentId, studentSql);
    const breakdown = evalResult.gradeBreakdown;

    const totalScore = breakdown.tupleMatchScore + breakdown.astScore + breakdown.performanceScore;
    const passed = breakdown.tupleMatchPassed && breakdown.astPassed;

    const [row] = await db
      .insert(assignmentSubmissionsTable)
      .values({
        assignmentId,
        studentId,
        submittedSql: studentSql.trim(),
        score: totalScore,
        passed,
        tupleMatchPassed: breakdown.tupleMatchPassed,
        astViolationsCount: breakdown.astIssues.length,
        executionTimeMs: breakdown.executionTimeMs,
        feedback: breakdown,
      })
      .returning();

    return {
      id: row.id,
      assignmentId: row.assignmentId,
      studentId: row.studentId,
      submittedSql: row.submittedSql,
      score: row.score,
      passed: row.passed,
      tupleMatchPassed: row.tupleMatchPassed,
      astViolationsCount: row.astViolationsCount,
      executionTimeMs: row.executionTimeMs,
      feedback: row.feedback as GradeBreakdown,
      createdAt: row.createdAt.toISOString(),
    };
  }

  /** Get student's latest submission for an assignment */
  async getStudentSubmission(studentId: string, assignmentId: string): Promise<AssignmentSubmission | null> {
    const [row] = await db
      .select()
      .from(assignmentSubmissionsTable)
      .where(
        and(
          eq(assignmentSubmissionsTable.assignmentId, assignmentId),
          eq(assignmentSubmissionsTable.studentId, studentId),
        ),
      )
      .orderBy(desc(assignmentSubmissionsTable.createdAt));

    if (!row) return null;

    return {
      id: row.id,
      assignmentId: row.assignmentId,
      studentId: row.studentId,
      submittedSql: row.submittedSql,
      score: row.score,
      passed: row.passed,
      tupleMatchPassed: row.tupleMatchPassed,
      astViolationsCount: row.astViolationsCount,
      executionTimeMs: row.executionTimeMs,
      feedback: row.feedback as GradeBreakdown,
      createdAt: row.createdAt.toISOString(),
    };
  }

  /** Get all submissions for an assignment (instructor view) */
  async listAssignmentSubmissions(assignmentId: string): Promise<AssignmentSubmission[]> {
    const rows = await db
      .select({
        id: assignmentSubmissionsTable.id,
        assignmentId: assignmentSubmissionsTable.assignmentId,
        studentId: assignmentSubmissionsTable.studentId,
        studentName: usersTable.displayName,
        studentEmail: usersTable.email,
        submittedSql: assignmentSubmissionsTable.submittedSql,
        score: assignmentSubmissionsTable.score,
        passed: assignmentSubmissionsTable.passed,
        tupleMatchPassed: assignmentSubmissionsTable.tupleMatchPassed,
        astViolationsCount: assignmentSubmissionsTable.astViolationsCount,
        executionTimeMs: assignmentSubmissionsTable.executionTimeMs,
        feedback: assignmentSubmissionsTable.feedback,
        createdAt: assignmentSubmissionsTable.createdAt,
      })
      .from(assignmentSubmissionsTable)
      .leftJoin(usersTable, eq(assignmentSubmissionsTable.studentId, usersTable.id))
      .where(eq(assignmentSubmissionsTable.assignmentId, assignmentId))
      .orderBy(desc(assignmentSubmissionsTable.createdAt));

    return rows.map((r) => ({
      id: r.id,
      assignmentId: r.assignmentId,
      studentId: r.studentId,
      studentName: r.studentName,
      studentEmail: r.studentEmail || '',
      submittedSql: r.submittedSql,
      score: r.score,
      passed: r.passed,
      tupleMatchPassed: r.tupleMatchPassed,
      astViolationsCount: r.astViolationsCount,
      executionTimeMs: r.executionTimeMs,
      feedback: r.feedback as GradeBreakdown,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}

export const classroomService = new ClassroomService();
