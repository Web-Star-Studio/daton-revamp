ALTER TABLE "organizations" ADD COLUMN "workos_organization_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_workos_organization_id_idx" ON "organizations" USING btree ("workos_organization_id");
