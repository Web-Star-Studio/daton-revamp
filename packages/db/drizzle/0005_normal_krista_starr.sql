CREATE INDEX "employees_cpf_idx" ON "employees" USING btree ("cpf");--> statement-breakpoint
CREATE INDEX "employees_org_email_idx" ON "employees" USING btree ("organization_id","email");
