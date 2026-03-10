CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"employee_code" text,
	"cpf" text,
	"full_name" text NOT NULL,
	"email" text,
	"phone" text,
	"department_id" uuid,
	"position_id" uuid,
	"hire_date" date NOT NULL,
	"birth_date" date,
	"gender" text,
	"ethnicity" text,
	"education_level" text,
	"salary" numeric(12, 2),
	"employment_type" text NOT NULL,
	"status" text NOT NULL,
	"manager_id" uuid,
	"location" text,
	"branch_id" uuid,
	"termination_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"department_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"level" text,
	"salary_range_min" numeric(12, 2),
	"salary_range_max" numeric(12, 2),
	"requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"responsibilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reports_to_position_id" uuid,
	"required_education_level" text,
	"required_experience_years" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN "parent_department_id" uuid;--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN "manager_employee_id" uuid;--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN "budget" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN "cost_center" text;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_manager_id_employees_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_reports_to_position_id_positions_id_fk" FOREIGN KEY ("reports_to_position_id") REFERENCES "public"."positions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "employees_cpf_idx" ON "employees" USING btree ("cpf");--> statement-breakpoint
CREATE INDEX "employees_org_email_idx" ON "employees" USING btree ("organization_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "employees_org_employee_code_idx" ON "employees" USING btree ("organization_id","employee_code");--> statement-breakpoint
CREATE INDEX "positions_org_title_idx" ON "positions" USING btree ("organization_id","title");--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_parent_department_id_departments_id_fk" FOREIGN KEY ("parent_department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;