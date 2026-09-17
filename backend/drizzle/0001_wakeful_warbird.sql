CREATE TYPE "public"."registration_mode" AS ENUM('open', 'invite_only', 'approval_required');--> statement-breakpoint
ALTER TYPE "public"."user_status" ADD VALUE 'pending_approval';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_settings" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"registration_mode" "registration_mode" DEFAULT 'open' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_owner" boolean DEFAULT false NOT NULL;