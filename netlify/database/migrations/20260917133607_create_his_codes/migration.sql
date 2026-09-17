CREATE TABLE "his_codes" (
	"id" serial PRIMARY KEY,
	"code" text NOT NULL UNIQUE,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
