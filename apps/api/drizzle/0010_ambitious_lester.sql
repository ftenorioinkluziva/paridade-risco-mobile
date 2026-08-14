ALTER TABLE "pluggy_investment_mappings" ALTER COLUMN "asset_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "pluggy_investment_mappings" ADD COLUMN "decision_reason" text;