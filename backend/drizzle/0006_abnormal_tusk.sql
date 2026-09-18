CREATE TABLE IF NOT EXISTS "classroom_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"submitted_sql" text NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"passed" boolean DEFAULT false NOT NULL,
	"tuple_match_passed" boolean DEFAULT false NOT NULL,
	"ast_violations_count" integer DEFAULT 0 NOT NULL,
	"execution_time_ms" integer DEFAULT 0 NOT NULL,
	"feedback" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "classroom_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"dialect" "dialect" NOT NULL,
	"initial_schema_sql" text DEFAULT '' NOT NULL,
	"reference_query_sql" text DEFAULT '' NOT NULL,
	"max_score" integer DEFAULT 100 NOT NULL,
	"due_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "challenge_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"sql" text NOT NULL,
	"passed" boolean DEFAULT false NOT NULL,
	"execution_time_ms" real DEFAULT 0 NOT NULL,
	"buffers_read" integer DEFAULT 0 NOT NULL,
	"query_length" integer DEFAULT 0 NOT NULL,
	"golf_score" integer DEFAULT 0 NOT NULL,
	"par_status" text DEFAULT 'par' NOT NULL,
	"ast_issues_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"dialect" "dialect" NOT NULL,
	"difficulty" text DEFAULT 'medium' NOT NULL,
	"initial_schema_sql" text NOT NULL,
	"reference_query_sql" text NOT NULL,
	"target_execution_time_ms" real DEFAULT 10 NOT NULL,
	"target_buffers_read" integer DEFAULT 100 NOT NULL,
	"creator_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "classroom_course_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "classroom_courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"join_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "classroom_courses_join_code_unique" UNIQUE("join_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "playground_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"title" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"sql" text NOT NULL,
	"dialect" "dialect" NOT NULL,
	"schema_statements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"schema_tables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "system_settings" ADD COLUMN "enabled_features" jsonb DEFAULT '{"sandbox":true,"playground":true,"classroom":true,"competition":true}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "system_settings" ADD COLUMN "smtp_config" jsonb;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classroom_submissions" ADD CONSTRAINT "classroom_submissions_assignment_id_classroom_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."classroom_assignments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classroom_submissions" ADD CONSTRAINT "classroom_submissions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classroom_assignments" ADD CONSTRAINT "classroom_assignments_course_id_classroom_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."classroom_courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "challenge_submissions" ADD CONSTRAINT "challenge_submissions_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "challenge_submissions" ADD CONSTRAINT "challenge_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "challenges" ADD CONSTRAINT "challenges_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classroom_course_enrollments" ADD CONSTRAINT "classroom_course_enrollments_course_id_classroom_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."classroom_courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classroom_course_enrollments" ADD CONSTRAINT "classroom_course_enrollments_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classroom_courses" ADD CONSTRAINT "classroom_courses_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "playground_shares" ADD CONSTRAINT "playground_shares_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_classroom_submissions_assignment_id" ON "classroom_submissions" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_classroom_submissions_student_id" ON "classroom_submissions" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_classroom_assignments_course_id" ON "classroom_assignments" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_challenge_submissions_challenge_id" ON "challenge_submissions" USING btree ("challenge_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_challenge_submissions_user_id" ON "challenge_submissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_challenge_submissions_leaderboard" ON "challenge_submissions" USING btree ("challenge_id","passed","buffers_read","execution_time_ms");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_challenges_difficulty" ON "challenges" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_challenges_dialect" ON "challenges" USING btree ("dialect");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_classroom_enrollments_course_id" ON "classroom_course_enrollments" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_classroom_enrollments_student_id" ON "classroom_course_enrollments" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_course_student" ON "classroom_course_enrollments" USING btree ("course_id","student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_classroom_courses_teacher_id" ON "classroom_courses" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_classroom_courses_join_code" ON "classroom_courses" USING btree ("join_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_playground_shares_author_id" ON "playground_shares" USING btree ("author_id");