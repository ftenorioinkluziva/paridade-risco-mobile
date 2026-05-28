CREATE TYPE "public"."asset_calculation_type" AS ENUM('PRECO', 'PERCENTUAL');--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "calculation_type" "asset_calculation_type" DEFAULT 'PRECO' NOT NULL;--> statement-breakpoint
