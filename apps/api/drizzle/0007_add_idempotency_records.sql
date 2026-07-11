CREATE TABLE IF NOT EXISTS "idempotency_records" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"operation" text NOT NULL,
	"key" text NOT NULL,
	"request_hash" text NOT NULL,
	"response_body" jsonb NOT NULL,
	"response_status" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "idempotency_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade
);
CREATE UNIQUE INDEX IF NOT EXISTS "idempotency_records_scope_idx" ON "idempotency_records" USING btree ("user_id","operation","key");
CREATE INDEX IF NOT EXISTS "idempotency_records_expires_at_idx" ON "idempotency_records" USING btree ("expires_at");

-- Rollback: DROP TABLE "idempotency_records";
