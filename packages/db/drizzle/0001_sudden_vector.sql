CREATE TYPE "public"."department_status" AS ENUM('active', 'archived');--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'department.create' BEFORE 'role.assign';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'department.update' BEFORE 'role.assign';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'department.archive' BEFORE 'role.assign';--> statement-breakpoint
CREATE TABLE "department_branch_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"manager_member_id" uuid,
	"notes" text,
	"status" "department_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "department_branch_assignments" ADD CONSTRAINT "department_branch_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_branch_assignments" ADD CONSTRAINT "department_branch_assignments_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_branch_assignments" ADD CONSTRAINT "department_branch_assignments_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_manager_member_id_organization_members_id_fk" FOREIGN KEY ("manager_member_id") REFERENCES "public"."organization_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "department_branch_assignments_unique_idx" ON "department_branch_assignments" USING btree ("department_id","branch_id");--> statement-breakpoint
CREATE INDEX "department_branch_assignments_branch_idx" ON "department_branch_assignments" USING btree ("branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "departments_org_code_idx" ON "departments" USING btree ("organization_id","code");