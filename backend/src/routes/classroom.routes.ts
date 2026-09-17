import { Elysia, t } from 'elysia';
import { success } from '../lib/response';
import { authMiddleware } from '../middleware';
import { classroomService } from '../services/classroom.service';

export const classroomRoutes = new Elysia({ prefix: '/classroom' })
  .use(authMiddleware)

  /* ── Courses ────────────────────────────────────────── */
  .get('/courses', async ({ auth }) => {
    const isTeacher = auth.role === 'admin';
    const courses = await classroomService.listCourses(auth.userId, isTeacher);
    return success(courses);
  })

  .post(
    '/courses',
    async ({ auth, body }) => {
      const course = await classroomService.createCourse(auth.userId, body);
      return success(course);
    },
    {
      body: t.Object({
        title: t.String({ minLength: 1, maxLength: 120 }),
        description: t.Optional(t.String({ maxLength: 500 })),
      }),
    },
  )

  .post(
    '/courses/join',
    async ({ auth, body }) => {
      const course = await classroomService.joinCourse(auth.userId, body);
      return success(course);
    },
    {
      body: t.Object({
        joinCode: t.String({ minLength: 4, maxLength: 10 }),
      }),
    },
  )

  .get(
    '/courses/:id',
    async ({ params }) => {
      const course = await classroomService.getCourse(params.id);
      return success(course);
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  /* ── Assignments ────────────────────────────────────── */
  .get(
    '/courses/:id/assignments',
    async ({ params }) => {
      const assignments = await classroomService.listAssignments(params.id);
      return success(assignments);
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  .post(
    '/courses/:id/assignments',
    async ({ auth, params, body }) => {
      const assignment = await classroomService.createAssignment(auth.userId, params.id, body);
      return success(assignment);
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        title: t.String({ minLength: 1, maxLength: 120 }),
        description: t.String({ maxLength: 2000 }),
        dialect: t.Union([
          t.Literal('postgresql'),
          t.Literal('mysql'),
          t.Literal('mariadb'),
          t.Literal('sqlite'),
          t.Literal('libsql'),
          t.Literal('mssql'),
        ]),
        initialSchemaSql: t.String(),
        referenceQuerySql: t.String(),
        maxScore: t.Optional(t.Integer({ minimum: 10, maximum: 100 })),
        dueDate: t.Optional(t.Nullable(t.String())),
      }),
    },
  )

  .get(
    '/assignments/:id',
    async ({ params }) => {
      const assignment = await classroomService.getAssignment(params.id);
      return success(assignment);
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  /* ── Dry-Run Testing & Submission ───────────────────── */
  .post(
    '/assignments/:id/test',
    async ({ auth, params, body }) => {
      const result = await classroomService.testQuery(auth.userId, params.id, body.sql);
      return success(result);
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        sql: t.String({ minLength: 1 }),
      }),
    },
  )

  .post(
    '/assignments/:id/submit',
    async ({ auth, params, body }) => {
      const submission = await classroomService.submitAssignment(auth.userId, params.id, body.sql);
      return success(submission);
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        sql: t.String({ minLength: 1 }),
      }),
    },
  )

  .get(
    '/assignments/:id/my-submission',
    async ({ auth, params }) => {
      const submission = await classroomService.getStudentSubmission(auth.userId, params.id);
      return success(submission);
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  .get(
    '/assignments/:id/submissions',
    async ({ params }) => {
      const submissions = await classroomService.listAssignmentSubmissions(params.id);
      return success(submissions);
    },
    {
      params: t.Object({ id: t.String() }),
    },
  );
