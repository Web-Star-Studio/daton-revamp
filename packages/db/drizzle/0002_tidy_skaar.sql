CREATE TYPE "public"."organization_onboarding_status" AS ENUM('pending', 'completed', 'skipped');--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "opening_date" date;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "tax_regime" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "primary_cnae" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "state_registration" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "municipal_registration" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "onboarding_status" "organization_onboarding_status" DEFAULT 'pending' NOT NULL;