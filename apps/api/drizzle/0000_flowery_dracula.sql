CREATE TYPE "public"."asset_type" AS ENUM('ETF', 'RENDA_FIXA', 'CRYPTO', 'COMMODITY', 'CAIXA', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."basket_status" AS ENUM('ATIVA', 'RASCUNHO');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('COMPRA', 'VENDA');--> statement-breakpoint
CREATE TABLE "assets" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"ticker" text NOT NULL,
	"name" text NOT NULL,
	"type" "asset_type" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "basket_allocations" (
	"basket_id" text NOT NULL,
	"asset_id" text NOT NULL,
	"target_percentage" numeric(5, 2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "basket_allocations_pk" PRIMARY KEY("basket_id","asset_id")
);
--> statement-breakpoint
CREATE TABLE "baskets" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" "basket_status" DEFAULT 'RASCUNHO' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "historical_prices" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"asset_id" text NOT NULL,
	"price_date" timestamp with time zone NOT NULL,
	"price" numeric(16, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolios" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"cash_balance" numeric(16, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"asset_id" text NOT NULL,
	"type" "transaction_type" NOT NULL,
	"shares" numeric(16, 8) NOT NULL,
	"price_per_share" numeric(16, 4) NOT NULL,
	"traded_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"selected_basket_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "basket_allocations" ADD CONSTRAINT "basket_allocations_basket_id_baskets_id_fk" FOREIGN KEY ("basket_id") REFERENCES "public"."baskets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "basket_allocations" ADD CONSTRAINT "basket_allocations_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baskets" ADD CONSTRAINT "baskets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historical_prices" ADD CONSTRAINT "historical_prices_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assets_ticker_idx" ON "assets" USING btree ("ticker");--> statement-breakpoint
CREATE UNIQUE INDEX "baskets_user_name_idx" ON "baskets" USING btree ("user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "historical_prices_asset_date_idx" ON "historical_prices" USING btree ("asset_id","price_date");--> statement-breakpoint
CREATE INDEX "historical_prices_asset_search_idx" ON "historical_prices" USING btree ("asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "portfolios_user_idx" ON "portfolios" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_user_traded_idx" ON "transactions" USING btree ("user_id","traded_at");--> statement-breakpoint
CREATE INDEX "transactions_asset_traded_idx" ON "transactions" USING btree ("asset_id","traded_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");