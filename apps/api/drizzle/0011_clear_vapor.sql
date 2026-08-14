CREATE TABLE "portfolio_source_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"source_mode" text DEFAULT 'MANUAL' NOT NULL,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portfolio_source_preferences" ADD CONSTRAINT "portfolio_source_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;