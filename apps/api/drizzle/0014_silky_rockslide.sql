CREATE TABLE "live_quotes" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"asset_id" text NOT NULL,
	"source" text NOT NULL,
	"topic" text NOT NULL,
	"quote_date" text,
	"quote_time" text,
	"last" numeric(20, 8),
	"open" numeric(20, 8),
	"high" numeric(20, 8),
	"low" numeric(20, 8),
	"strike" numeric(20, 8),
	"trades" integer,
	"expiration" text,
	"raw_data" jsonb NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "live_quotes" ADD CONSTRAINT "live_quotes_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "live_quotes_asset_source_idx" ON "live_quotes" USING btree ("asset_id","source");--> statement-breakpoint
CREATE INDEX "live_quotes_received_at_idx" ON "live_quotes" USING btree ("received_at");