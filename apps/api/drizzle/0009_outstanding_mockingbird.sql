CREATE TABLE "pluggy_investment_mappings" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"pluggy_investment_id" text NOT NULL,
	"asset_id" text NOT NULL,
	"status" text DEFAULT 'MAPEADO' NOT NULL,
	"approved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pluggy_investment_mappings" ADD CONSTRAINT "pluggy_investment_mappings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pluggy_investment_mappings" ADD CONSTRAINT "pluggy_investment_mappings_pluggy_investment_id_pluggy_investments_id_fk" FOREIGN KEY ("pluggy_investment_id") REFERENCES "public"."pluggy_investments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pluggy_investment_mappings" ADD CONSTRAINT "pluggy_investment_mappings_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pluggy_investment_mappings_investment_idx" ON "pluggy_investment_mappings" USING btree ("user_id","pluggy_investment_id");--> statement-breakpoint
CREATE INDEX "pluggy_investment_mappings_user_idx" ON "pluggy_investment_mappings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pluggy_investment_mappings_asset_idx" ON "pluggy_investment_mappings" USING btree ("asset_id");