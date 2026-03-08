# PRD: Core Platform MVP

Date: 2026-03-07
Status: Draft
Owner: Daton

## 1. Executive Summary

This PRD defines the first clean-slate MVP for the new Daton platform. The goal is to rebuild the operational foundation from zero with a smaller, production-ready scope, while preserving the most valuable business concepts from the current codebase.

The MVP will include three core modules:

1. Collaborator Management
2. Branch Management
3. Document Management

These three modules form the minimum viable operating system for a multi-branch organization. They create the base tenant model, user structure, branch hierarchy, and documented operational control needed for future ESG, quality, compliance, supplier, and training modules.

This MVP will not use Supabase. It will use a Cloudflare-first architecture, a self-managed application backend, and local Docker-based infrastructure for development.

## 2. Product Vision

Build a modern multi-tenant B2B operations platform where an organization can:

- manage its collaborators and internal roles;
- manage one or more branches under the same organization;
- centralize and control documents with versioning, branch scope, and auditability.

The product should be fast to build, easy to maintain, and credible for production use from day one.

## 3. Product Goals

### Business Goals

- Replace the current overly broad and fragmented implementation with a focused and maintainable MVP.
- Establish the base platform required for future Social, ESG, Quality, and Compliance modules.
- Support real organizations with one or more branches and controlled operational documents.

### Product Goals

- Allow an organization admin to onboard their company and first branch.
- Allow admins to create, edit, deactivate, and organize collaborators.
- Allow admins to create and manage branch hierarchy and branch metadata.
- Allow teams to upload, organize, version, search, and control documents.
- Ensure branch-based visibility and document assignment from the beginning.

### Engineering Goals

- Cloudflare must be the production hosting platform.
- Keep the architecture simple enough for a small team to move quickly.
- Use strongly typed contracts, tested business logic, and a clean modular backend.
- Avoid vendor lock-in to Supabase-specific patterns.

## 4. Non-Goals for MVP

The following items are explicitly out of scope for the initial release:

- ESG dashboards and indicators
- training management
- supplier portal
- advanced approval workflow builder
- AI-powered document extraction
- GRI or integrated reporting
- payroll and compensation calculations
- attendance and time tracking
- advanced organization chart visualization
- regulatory license lifecycle management
- custom form builders

These can be added after the core platform is stable.

## 5. Target Users

### Primary Users

- Organization Admin
- HR or People Admin
- Branch Manager
- Document Controller / Quality Admin

### Secondary Users

- General collaborator with limited access to documents and profile information

## 6. Core Personas

### Organization Admin

Needs to create branches, invite collaborators, assign roles, and keep operational documents under control.

### People Admin

Needs to maintain collaborator records, assign branch and manager relationships, and keep core workforce data current.

### Branch Manager

Needs visibility into collaborators and documents relevant to one or more branches they manage.

### Document Controller

Needs to publish and maintain controlled documents, manage versions, and ensure the right branches and people can access them.

## 7. Scope Overview

### MVP Modules

- Organization and Authentication Foundation
- Collaborator Management
- Branch Management
- Document Management
- RBAC, Audit Log, and Search

### Cross-Module Rule

Branches are a first-class scope boundary. Collaborators belong to an organization and may be assigned to one primary branch. Documents belong to an organization and may be visible to one or more branches.

## 8. Functional Requirements

## 8.1 Foundation: Organization, Auth, and Roles

### Problem

The system needs a secure base tenant model before any business module can work.

### Requirements

- Support organizations as the top-level tenant.
- Support one initial admin user during organization setup.
- Support email/password login.
- Support secure session-based authentication.
- Support role-based permissions.
- Support organization-scoped data isolation in the application layer and database layer.

### MVP Roles

- `owner`
- `admin`
- `hr_admin`
- `branch_manager`
- `document_controller`
- `collaborator`
- `viewer`

### Role Rules

- `owner` and `admin` can manage all branches, collaborators, and documents.
- `hr_admin` can manage collaborators but not platform-level settings.
- `branch_manager` can view and manage collaborators/documents for assigned branches within policy limits.
- `document_controller` can create and maintain documents.
- `collaborator` can view their own profile and documents granted to them.
- `viewer` has read-only access to allowed resources.

## 8.2 Module 1: Collaborator Management

### Problem

The organization needs a clean internal registry of people, their roles, branch assignment, reporting structure, and status.

### Goals

- Maintain a reliable collaborator directory.
- Link collaborators to branches and managers.
- Provide the foundation for future training, compliance, and social indicators.

### Core Entities

- Collaborator
- Collaborator Role Assignment
- Collaborator Status History
- Optional Collaborator Document Link

### MVP Requirements

- Create collaborator
- Edit collaborator
- Deactivate collaborator
- Reactivate collaborator
- View collaborator profile
- List collaborators with filters
- Assign collaborator to primary branch
- Assign collaborator manager
- Assign one or more application roles

### Collaborator Fields

- internal code
- full name
- email
- phone
- government ID or tax ID field
- hire date
- termination date
- status
- department
- position
- manager
- primary branch
- notes

### Filters

- branch
- status
- department
- role
- manager
- search by name/email/code

### Permissions

- Admins can manage all collaborators in the organization.
- Branch managers can view collaborators in their branch scope.
- Collaborators can view only their own basic profile.

### Out of Scope for Collaborators MVP

- performance reviews
- benefits
- salary management
- training records
- competencies
- attendance

## 8.3 Module 2: Branch Management

### Problem

Organizations may operate through one or more branches, and operational data must respect this structure.

### Goals

- Model headquarters and child branches cleanly.
- Use branches as a scope boundary for collaborators and documents.
- Prepare for future branch-based reporting and operational workflows.

### Core Entities

- Branch
- Branch Hierarchy
- Branch Manager Assignment

### MVP Requirements

- Create branch
- Edit branch
- Activate/deactivate branch
- Mark a branch as headquarters
- Set parent branch for hierarchy
- Assign a branch manager
- List branches with filters
- View branch detail and linked collaborators/documents counts

### Branch Fields

- name
- code
- legal identifier
- email
- phone
- address
- city
- state/province
- postal code
- country
- latitude/longitude optional
- branch status
- headquarters flag
- parent branch
- branch manager

### Business Rules

- Every organization must have at least one branch.
- Only one branch can be the headquarters at a time.
- A branch can have zero or more child branches.
- A collaborator can have one primary branch in MVP.
- Documents can be linked to one or more branches.

### Delete/Archive Behavior

- Hard delete is not allowed for branches with linked collaborators or documents.
- Branches should be deactivated or archived instead.

## 8.4 Module 3: Document Management

### Problem

The organization needs a central, auditable document system tied to branches and collaborators, without carrying over the current system's excess complexity.

### Product Principle

The MVP document system should be lean but strong:

- upload and storage must be reliable;
- metadata and versioning must be first-class;
- branch scope must be built in;
- auditability must exist from the start;
- advanced AI and complex workflows should wait.

### Core Entities

- Document
- Document Version
- Document Branch Scope
- Document Event / Audit Log
- Optional Document Read Acknowledgement

### MVP Requirements

- Upload document
- Replace document with a new version
- View document detail
- Download document
- Preview document
- Edit document metadata
- Archive document
- Search/filter documents
- Assign document to one or more branches
- Optionally link document to a collaborator

### Document Types

- general document
- controlled document

### Document Statuses

- draft
- active
- archived

### Document Metadata

- title
- description / summary
- tags
- document type
- status
- owner or uploader
- branch scope
- optional linked collaborator
- confidentiality level
- effective date
- review due date

### Controlled Document Requirements

Controlled documents in MVP must support:

- version number
- current version marker
- change summary
- effective date
- optional review due date
- audit history

### Search and Filters

- search by title, filename, and tags
- filter by branch
- filter by type
- filter by status
- filter by linked collaborator
- filter by uploader

### Permissions

- Admins and document controllers can create and update documents.
- Branch managers can view documents within their branch scope and may upload branch documents if permitted.
- Collaborators can view only documents explicitly available to their branch or individually linked to them.

### Optional but Recommended for MVP

- read acknowledgement for controlled documents

This should be included only if it does not meaningfully delay the first release.

### Out of Scope for Documents MVP

- AI extraction
- OCR
- workflow builder
- complex approval routing
- deduplication engine
- regulatory-specific lifecycle
- document relationship graph
- bulk import beyond basic CSV metadata import

## 9. Cross-Module User Flows

### Flow 1: Initial Setup

1. Owner creates organization.
2. Owner creates headquarters branch.
3. Owner invites first admins and managers.

### Flow 2: Collaborator Onboarding

1. Admin creates collaborator.
2. Collaborator is assigned to a branch and role.
3. Collaborator receives invitation and activates account.

### Flow 3: Controlled Document Publication

1. Document controller uploads a controlled document.
2. Metadata is filled, branch visibility is assigned, and version `1` is created.
3. Allowed users can view and download the active version.
4. When updated, a new version is created with a mandatory change summary.

### Flow 4: Branch Transfer

1. HR admin updates collaborator primary branch.
2. Collaborator visibility updates according to branch-based permissions.

## 10. High-Level Data Model

### Core Tables

- `organizations`
- `users`
- `user_sessions`
- `roles`
- `user_role_assignments`
- `branches`
- `collaborators`
- `documents`
- `document_versions`
- `document_branch_scopes`
- `document_events`
- `document_read_acknowledgements` optional

### Key Relationships

- Organization has many branches.
- Organization has many collaborators.
- Branch has many collaborators.
- Document belongs to one organization.
- Document has many versions.
- Document can belong to many branches through a scope table.
- Document may optionally link to one collaborator.

## 11. MVP API Surface

### Collaborators

- `POST /api/collaborators`
- `GET /api/collaborators`
- `GET /api/collaborators/:id`
- `PATCH /api/collaborators/:id`
- `POST /api/collaborators/:id/deactivate`
- `POST /api/collaborators/:id/reactivate`

### Branches

- `POST /api/branches`
- `GET /api/branches`
- `GET /api/branches/:id`
- `PATCH /api/branches/:id`
- `POST /api/branches/:id/archive`

### Documents

- `POST /api/documents`
- `GET /api/documents`
- `GET /api/documents/:id`
- `PATCH /api/documents/:id`
- `POST /api/documents/:id/versions`
- `GET /api/documents/:id/download`
- `POST /api/documents/:id/archive`

## 12. Non-Functional Requirements

### Security

- Tenant isolation must be enforced on every request.
- Session cookies must be HTTP-only and secure in production.
- Authorization must be enforced in backend services, not only in frontend UI.
- File uploads must validate size, type, and ownership rules.
- Audit events must be written for sensitive actions.

### Reliability

- File metadata and file object writes must be handled transactionally where possible.
- Version creation must be atomic.
- Failed uploads must not leave orphaned metadata or orphaned files.

### Performance

- List screens must support pagination.
- Search and filter queries must be indexed.
- Document metadata responses should not load full history by default.

### Observability

- Structured logs
- request tracing
- error monitoring
- audit log for business actions

### Backup and Recovery

- Database backup policy must be defined before production launch.
- Document storage retention policy must be defined before production launch.

## 13. Recommended Stack

## 13.1 Recommendation

Use a Cloudflare-first full-stack architecture with a separate frontend and API, optimized for speed, maintainability, and production deployment.

### Frontend

- React
- Vite
- TypeScript
- TanStack Router
- TanStack Query
- Tailwind CSS v3
- shadcn/ui
- React Hook Form
- Zod

### Backend

- TypeScript
- Hono on Cloudflare Workers
- Zod for validation
- Drizzle ORM

### Database

- PostgreSQL
- Local development in Docker
- Production on managed PostgreSQL
- Cloudflare Hyperdrive between Workers and PostgreSQL in production

### File Storage

- Cloudflare R2 for document storage

### Async and Background Work

- Cloudflare Queues for document post-processing and non-blocking background jobs

### Deployment

- Cloudflare Workers for API
- Cloudflare Pages or Workers Assets for frontend
- GitHub Actions for CI/CD

### Local Development Infrastructure

- Docker Compose
- PostgreSQL
- Mailpit for transactional email testing

## 13.2 Why This Stack

### Why Vite instead of Next.js

For this MVP, the product is an authenticated back-office application, not an SEO-first marketing product. Vite keeps the frontend simpler, faster to iterate on, and easier to deploy on Cloudflare without the extra runtime and adapter complexity of a full Next.js setup.

### Why Hono instead of Express or Fastify

Express is not a natural fit for Cloudflare Workers. Fastify is stronger than Express, but still not the best Cloudflare-native choice. Hono is designed for edge runtimes, fits Workers naturally, keeps the API layer lightweight, and reduces deployment friction.

### Why PostgreSQL instead of D1 for this MVP

The product already points toward relational complexity: organizations, branches, collaborators, document versions, scopes, and audit events. PostgreSQL is a better long-term fit for this shape and gives stronger querying, migration, and relational guarantees for future modules.

### Why R2

Documents are a core module, so object storage should be native to the deployment platform. R2 is the correct default for Cloudflare-based document storage.

## 14. Architecture Principles

- Monorepo with clear package boundaries.
- Backend owns business rules and authorization.
- Frontend consumes typed APIs only.
- No direct database access from the frontend.
- Documents metadata and object storage are separate concerns.
- Every module must be organization-scoped.
- Branch scoping must be part of the core domain, not an afterthought.

## 15. Suggested Monorepo Structure

```text
apps/
  web/
  api/
packages/
  ui/
  config/
  db/
  types/
  sdk/
infra/
  docker/
```

## 16. MVP Release Plan

### Phase 1: Foundation

- organization model
- auth
- RBAC
- base UI shell
- branch-scoped authorization model

### Phase 2: Branches

- branch CRUD
- headquarters and hierarchy rules
- branch manager assignment

### Phase 3: Collaborators

- collaborator CRUD
- role assignment
- branch assignment
- filters and pagination

### Phase 4: Documents

- upload/download/preview
- metadata editing
- branch scoping
- versioning
- archive flow
- audit log

### Phase 5: Hardening

- tests
- observability
- permissions review
- deployment readiness

## 17. Acceptance Criteria

The MVP is considered release-ready when:

- an organization can create and manage branches;
- admins can create, assign, and manage collaborators;
- documents can be uploaded, versioned, scoped to branches, and audited;
- Cloudflare deployment is working for frontend and API;
- local development works with Docker-based infrastructure;
- the backend is fully owned by the application and does not depend on Supabase;
- core flows are covered by automated tests.

## 18. Success Metrics

### Product

- time to create a new organization and first branch
- time to invite and activate collaborators
- time to upload and publish a controlled document
- number of support issues caused by branch visibility or permissions

### Engineering

- deployment success rate
- test pass rate
- median API latency
- failed upload rate
- document versioning error rate

## 19. Open Decisions

- Whether read acknowledgement for controlled documents is in MVP or post-MVP
- Whether collaborator-linked personal documents are first release or release `1.1`
- Whether a lightweight email invitation service is built in release `1.0` or staged immediately after launch

## 20. Recommendation Summary

Build the new MVP as a Cloudflare-first platform with:

- Vite + React on the frontend
- Hono + Workers on the backend
- PostgreSQL as the system of record
- R2 for document files
- Queues for background processing
- Docker Compose for local infrastructure

Do not carry over the old system's module sprawl, AI-heavy document pipeline, or duplicated SGQ/document flows into this first release.
