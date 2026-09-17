CREATE TYPE "public"."engine_status" AS ENUM('stopped', 'running');--> statement-breakpoint
CREATE TYPE "public"."server_dialect" AS ENUM('postgresql', 'mysql', 'mariadb', 'mssql');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sandbox_engines" (
	"dialect" "server_dialect" PRIMARY KEY NOT NULL,
	"container_id" text,
	"status" "engine_status" DEFAULT 'stopped' NOT NULL,
	"started_at" timestamp with time zone
);
