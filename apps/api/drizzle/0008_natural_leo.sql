CREATE TABLE IF NOT EXISTS "pluggy_connections" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "user_id" text NOT NULL,
  "item_id" text NOT NULL,
  "environment" text DEFAULT 'sandbox' NOT NULL,
  "connector_id" text,
  "connector_name" text,
  "status" text DEFAULT 'UNKNOWN' NOT NULL,
  "consent_expires_at" timestamp with time zone,
  "last_sync_at" timestamp with time zone,
  "last_sync_status" text,
  "last_error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "pluggy_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pluggy_accounts" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "connection_id" text NOT NULL,
  "user_id" text NOT NULL,
  "source_account_id" text NOT NULL,
  "type" text,
  "subtype" text,
  "name" text NOT NULL,
  "balance" numeric(20, 4),
  "available_balance" numeric(20, 4),
  "credit_limit" numeric(20, 4),
  "available_credit_limit" numeric(20, 4),
  "balance_due_date" timestamp with time zone,
  "balance_close_date" timestamp with time zone,
  "minimum_payment" numeric(20, 4),
  "currency_code" text,
  "status" text,
  "raw_data" jsonb NOT NULL,
  "observed_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "pluggy_accounts_connection_id_pluggy_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."pluggy_connections"("id") ON DELETE cascade,
  CONSTRAINT "pluggy_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pluggy_investments" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "connection_id" text NOT NULL,
  "user_id" text NOT NULL,
  "source_investment_id" text NOT NULL,
  "provider_id" text,
  "code" text,
  "isin" text,
  "investment_number" text,
  "name" text NOT NULL,
  "type" text,
  "subtype" text,
  "quantity" numeric(24, 8),
  "balance" numeric(20, 4),
  "amount_original" numeric(20, 4),
  "amount_profit" numeric(20, 4),
  "amount_withdrawal" numeric(20, 4),
  "currency_code" text,
  "issuer" text,
  "status" text,
  "raw_data" jsonb NOT NULL,
  "observed_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "pluggy_investments_connection_id_pluggy_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."pluggy_connections"("id") ON DELETE cascade,
  CONSTRAINT "pluggy_investments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pluggy_loans" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "connection_id" text NOT NULL,
  "user_id" text NOT NULL,
  "source_loan_id" text NOT NULL,
  "name" text,
  "status" text,
  "original_amount" numeric(20, 4),
  "outstanding_balance" numeric(20, 4),
  "installment_amount" numeric(20, 4),
  "interest_rate" numeric(12, 6),
  "next_due_date" timestamp with time zone,
  "maturity_date" timestamp with time zone,
  "raw_data" jsonb NOT NULL,
  "observed_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "pluggy_loans_connection_id_pluggy_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."pluggy_connections"("id") ON DELETE cascade,
  CONSTRAINT "pluggy_loans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pluggy_transactions" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "connection_id" text NOT NULL,
  "account_id" text NOT NULL,
  "user_id" text NOT NULL,
  "source_transaction_id" text NOT NULL,
  "source_account_id" text NOT NULL,
  "transaction_date" timestamp with time zone,
  "description" text,
  "amount" numeric(20, 4),
  "type" text,
  "status" text,
  "category" text,
  "merchant_name" text,
  "installment_number" integer,
  "total_installments" integer,
  "total_amount" numeric(20, 4),
  "bill_id" text,
  "purchase_date" timestamp with time zone,
  "raw_data" jsonb NOT NULL,
  "observed_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "pluggy_transactions_connection_id_pluggy_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."pluggy_connections"("id") ON DELETE cascade,
  CONSTRAINT "pluggy_transactions_account_id_pluggy_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."pluggy_accounts"("id") ON DELETE cascade,
  CONSTRAINT "pluggy_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pluggy_sync_runs" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "connection_id" text NOT NULL,
  "user_id" text NOT NULL,
  "status" text NOT NULL,
  "started_at" timestamp with time zone NOT NULL,
  "finished_at" timestamp with time zone,
  "counts" jsonb,
  "error" text,
  CONSTRAINT "pluggy_sync_runs_connection_id_pluggy_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."pluggy_connections"("id") ON DELETE cascade,
  CONSTRAINT "pluggy_sync_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pluggy_connections_item_idx" ON "pluggy_connections" USING btree ("item_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pluggy_connections_user_idx" ON "pluggy_connections" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pluggy_accounts_source_idx" ON "pluggy_accounts" USING btree ("connection_id", "source_account_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pluggy_accounts_user_idx" ON "pluggy_accounts" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pluggy_investments_source_idx" ON "pluggy_investments" USING btree ("connection_id", "source_investment_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pluggy_investments_user_idx" ON "pluggy_investments" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pluggy_investments_identifier_idx" ON "pluggy_investments" USING btree ("isin", "code");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pluggy_loans_source_idx" ON "pluggy_loans" USING btree ("connection_id", "source_loan_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pluggy_loans_user_idx" ON "pluggy_loans" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pluggy_transactions_source_idx" ON "pluggy_transactions" USING btree ("connection_id", "source_transaction_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pluggy_transactions_account_date_idx" ON "pluggy_transactions" USING btree ("account_id", "transaction_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pluggy_transactions_user_date_idx" ON "pluggy_transactions" USING btree ("user_id", "transaction_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pluggy_sync_runs_connection_started_idx" ON "pluggy_sync_runs" USING btree ("connection_id", "started_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pluggy_sync_runs_user_started_idx" ON "pluggy_sync_runs" USING btree ("user_id", "started_at");

-- Rollback: DROP TABLE "pluggy_transactions", "pluggy_loans", "pluggy_investments", "pluggy_accounts", "pluggy_sync_runs", "pluggy_connections";
