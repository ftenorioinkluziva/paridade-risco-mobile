CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'USER');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "image" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'USER' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "birth_date" timestamp with time zone;--> statement-breakpoint
CREATE TABLE "investment_funds" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"name" text NOT NULL,
	"initial_investment" numeric(16, 2) NOT NULL,
	"current_value" numeric(16, 2) NOT NULL,
	"investment_date" timestamp with time zone NOT NULL,
	"user_id" text NOT NULL,
	"index_asset_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "investment_funds" ADD CONSTRAINT "investment_funds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_funds" ADD CONSTRAINT "investment_funds_index_asset_id_assets_id_fk" FOREIGN KEY ("index_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "investment_funds_user_idx" ON "investment_funds" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "investment_funds_index_asset_idx" ON "investment_funds" USING btree ("index_asset_id");