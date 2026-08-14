CREATE TABLE "pluggy_webhook_events" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"event_id" text NOT NULL,
	"event" text NOT NULL,
	"item_id" text,
	"account_id" text,
	"user_id" text,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'RECEIVED' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now(),
	"processed_at" timestamp with time zone,
	"last_error" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pluggy_webhook_events" ADD CONSTRAINT "pluggy_webhook_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pluggy_webhook_events_event_id_idx" ON "pluggy_webhook_events" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "pluggy_webhook_events_status_attempt_idx" ON "pluggy_webhook_events" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "pluggy_webhook_events_item_received_idx" ON "pluggy_webhook_events" USING btree ("item_id","received_at");