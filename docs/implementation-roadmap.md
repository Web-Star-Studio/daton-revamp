# Implementation Roadmap: ISO-Aligned Core Platform MVP

Date: 2026-03-07
Status: Draft
Depends on: [prd-mvp-core-platform.md](/Users/webstar/Documents/projects/daton/daton-esg-insight/docs/prd-mvp-core-platform.md)

## 1. Purpose

This document converts the MVP PRD into an implementation roadmap aligned to the ISO 9001:2015 requirements provided for:

- Document Management: item `7.5`
- Social / Collaborator domain: items `7.1.6`, `7.2.a`, `7.2.b`, `7.2.c`, `7.3`

The roadmap is intentionally opinionated. It prioritizes:

- production-ready core flows;
- auditable data and process control;
- Cloudflare-first deployment;
- minimum scope needed to support future certification work.

## 2. Normative Basis

As of `2026-03-07`, `ISO 9001:2015` remains the active edition. ISO states that:

- ISO 9001:2015 remains current;
- support topics include competence, awareness, communication, and documented information;
- the next revision is expected in `September 2026`.

This roadmap therefore targets `ISO 9001:2015`, while avoiding design choices that would make the later transition harder.

## 3. Interpretation Notes

This roadmap is based on:

- ISO public guidance and ISO committee material;
- secondary implementation guidance used only where the full clause text is not openly available;
- the current repo’s own compliance assessments for `7.2` and `7.5`.

Important:

- The ISO standard text itself is copyrighted, so this roadmap uses implementation-oriented interpretations rather than reproducing clause text.
- Where the roadmap turns a clause into product requirements, that is an implementation inference, not a verbatim restatement of the standard.

## 4. Strategic Decision

To satisfy the requested ISO requirements, the MVP scope must be interpreted as follows:

### Social Module

The Social MVP is not only collaborator CRUD.

It must include:

- collaborator management;
- position and role definitions;
- required competencies by position;
- evidence of competence;
- actions to acquire competence;
- evaluation of action effectiveness;
- awareness acknowledgements;
- organizational knowledge linkage.

### Branch Module

The Branch MVP is not just branch CRUD.

It must provide:

- branch hierarchy;
- branch manager assignment;
- branch-based scoping for collaborators and documents;
- branch-level visibility for competence and documented information.

### Document Module

The Document MVP is not only file upload.

It must provide:

- documented information control;
- maintain vs retain behavior;
- version history;
- branch scope;
- retention and disposition rules;
- auditability.

## 5. Recommended Delivery Model

Use both planning lenses:

- by module, for business clarity;
- by sprint, for execution clarity.

Recommended sprint cadence:

- `2-week sprints`
- each sprint ends with:
  - demoable user flows,
  - testable acceptance criteria,
  - explicit compliance evidence produced in the product itself.

## 6. Architecture Baseline

The roadmap assumes this stack:

- Frontend: `React + Vite + TypeScript + TanStack Query + TanStack Router + Tailwind v3`
- Backend API: `Hono + TypeScript on Cloudflare Workers`
- Database: `PostgreSQL`
- DB connectivity in production: `Cloudflare Hyperdrive`
- Object storage: `Cloudflare R2`
- Background work: `Cloudflare Queues`
- Infra for local development: `Docker Compose`
- ORM and migrations: `Drizzle ORM`

## 7. Compliance Design Rules

These rules apply across all modules.

### Rule 1: Every important action must leave evidence

Examples:

- collaborator role assignment
- branch activation/deactivation
- document publication
- new document version
- awareness acknowledgement
- competence evaluation

### Rule 2: System behavior must distinguish "maintain" and "retain"

For this MVP:

- maintained information is active operational information that can be revised;
- retained information is evidence that must remain preserved for traceability.

### Rule 3: Branch is a scope boundary

- collaborators belong to an organization and a primary branch;
- documents may be scoped to one or more branches;
- awareness and competence evidence must be attributable to branch context where relevant.

### Rule 4: Compliance cannot depend on frontend-only logic

All access, transitions, and evidence creation must be enforced in the backend and persisted in the database.

### Rule 5: Auditability beats convenience

If a feature creates ambiguity in historical traceability, it should not be included in the MVP.

## 8. Module Roadmap

## 8.1 Module A: Platform Foundation

### Goal

Establish the secure tenant, auth, RBAC, and infrastructure foundations required by all other modules.

### Scope

- organization model
- user auth
- session management
- RBAC
- branch-aware authorization
- audit event framework
- Cloudflare deployment pipeline

### Deliverables

- `organizations`
- `users`
- `sessions`
- `roles`
- `user_role_assignments`
- `audit_events`
- request context with `organization_id`, `user_id`, `role_scope`, `branch_scope`

### Compliance Contribution

Indirect support for all clauses by providing:

- controlled access;
- evidence of who did what;
- organization-scoped information handling.

### Exit Criteria

- authenticated users can only access their own organization data;
- every write action records an audit event;
- application runs in local Docker and deploys to Cloudflare.

## 8.2 Module B: Branch Management

### Goal

Model the organization’s operational structure and provide the scope boundary for collaborators and documents.

### MVP Scope

- create/edit/archive branch
- headquarters rule
- parent-child hierarchy
- branch manager assignment
- branch detail page
- branch filters and search

### Data Model

- `branches`
- `branch_manager_assignments`

### Required Features

- one and only one active headquarters per organization;
- branch archive instead of destructive delete when dependencies exist;
- branch summary counters:
  - collaborators count
  - active documents count
  - controlled documents count

### Compliance Contribution

Branch module does not directly satisfy the listed ISO clauses, but it is necessary to:

- determine where people operate;
- determine where knowledge and documented information apply;
- show branch-level responsibility and access control.

### Exit Criteria

- branch hierarchy is persisted and queryable;
- collaborator and document modules can use branch scope;
- branch manager permissions work correctly.

## 8.3 Module C: Social Module

### Goal

Deliver the minimum collaborator and competence system needed to support ISO `7.1.6`, `7.2`, and `7.3`.

### Important Scope Adjustment

This module includes four subdomains:

- collaborator registry
- positions and required competencies
- competence evidence and actions
- awareness and organizational knowledge

### C1. Collaborator Registry

#### Scope

- create/edit/archive collaborator
- assign primary branch
- assign manager
- assign roles
- view profile
- search/filter

#### Data Model

- `collaborators`
- `collaborator_branch_assignments`
- `collaborator_manager_assignments`

#### Exit Criteria

- collaborator lifecycle is stable and auditable;
- collaborator filters by branch, manager, role, status work correctly.

### C2. Positions and Required Competencies

#### Why

This is necessary for `7.2.a`.

#### Scope

- create/edit/archive positions
- assign position to collaborator
- define required competencies by position
- define required education, experience, certifications, and mandatory knowledge items

#### Data Model

- `positions`
- `competencies`
- `position_competency_requirements`
- `position_requirements`

#### MVP Feature Set

- competency categories
- required level
- evidence type expected
- review cadence optional
- sensitive-position flag optional but recommended

#### Exit Criteria

- every active collaborator can have a position;
- every governed position can define required competencies;
- required competencies are queryable by collaborator and branch.

### C3. Competence Evidence

#### Why

This is necessary for `7.2.b`.

#### Scope

- store evidence of education
- store evidence of experience
- store evidence of certifications
- record competence assessment result
- calculate compliance gap between person and position requirement

#### Data Model

- `collaborator_education_records`
- `collaborator_experience_records`
- `collaborator_certifications`
- `collaborator_competency_assessments`

#### MVP Feature Set

- evidence upload or reference
- assessment status:
  - compliant
  - partially compliant
  - not compliant
- branch and position context

#### Exit Criteria

- admins can prove why a collaborator is considered competent or not;
- the system can generate a per-collaborator gap view.

### C4. Actions to Acquire Competence

#### Why

This is necessary for `7.2.c`.

#### Scope

- create development action
- assign training or mentoring action to collaborator
- set due date and owner
- record completion
- record effectiveness review

#### Data Model

- `competence_development_actions`
- `development_action_reviews`

#### MVP Feature Set

- manual action creation is enough for MVP;
- full LMS is out of scope;
- effectiveness review is mandatory for closed actions.

#### Exit Criteria

- a detected competence gap can trigger an action;
- a closed action requires effectiveness evaluation.

### C5. Awareness

#### Why

This is necessary for `7.3`.

#### Scope

- publish awareness items
- assign awareness items to collaborators or branches
- acknowledge awareness
- track due date and completion

#### Awareness Item Types

- quality policy
- quality objectives summary
- role contribution statement
- implications of nonconformity
- mandatory branch or process communication

#### Data Model

- `awareness_items`
- `awareness_assignments`
- `awareness_acknowledgements`

#### Exit Criteria

- the organization can demonstrate who was made aware of what;
- acknowledgements are timestamped and attributable.

### C6. Organizational Knowledge

#### Why

This is necessary for `7.1.6`.

#### Scope

- define knowledge items needed for positions or processes
- link knowledge items to documents
- link knowledge items to positions and branches
- preserve access to current knowledge source

#### Data Model

- `organizational_knowledge_items`
- `knowledge_document_links`
- `position_knowledge_requirements`

#### MVP Principle

This is not a wiki product.

In MVP, organizational knowledge means:

- identifying required operational knowledge;
- linking it to the controlled source of truth;
- making it available to the right people.

#### Exit Criteria

- the organization can map a position or process to required knowledge;
- each required knowledge item links to an accessible controlled source.

## 8.4 Module D: Document Management

### Goal

Deliver a lean but strong documented information system aligned to ISO `7.5`.

### Scope

- upload document
- edit metadata
- preview and download
- controlled vs general document
- create new version
- branch scoping
- linked collaborator optional
- archive
- retention policy field
- disposition workflow
- audit trail

### D1. Core Document Registry

#### Data Model

- `documents`
- `document_branch_scopes`
- `document_events`

#### Required Fields

- title
- file name
- file path
- document type
- status
- confidentiality level
- owner/uploader
- branch scope
- retention category or period

#### Exit Criteria

- documents are searchable and filterable;
- access is enforced by organization and branch scope.

### D2. Controlled Documents

#### Why

This is necessary for practical `7.5` compliance.

#### Data Model

- `document_versions`
- `document_control_profiles`

#### Required Features

- current version
- version number
- change summary
- effective date
- optional review due date
- archive state

#### Exit Criteria

- one document can have many versions;
- one and only one current version exists at a time;
- new version creation records reason for change.

### D3. Maintain vs Retain

#### Why

This is the key product interpretation of `7.5` for the MVP.

#### Required Features

- classify whether information is operationally maintained, retained as evidence, or both;
- retention period field and rules;
- archived and obsolete behavior;
- disposition action with justification;
- prevented hard delete for retained evidence except by privileged policy path.

#### Data Model

- `document_retention_rules`
- `document_disposition_actions`

#### Exit Criteria

- the system can show which information is still active, archived, or retained as evidence;
- disposition always leaves a preserved audit record.

### D4. Access and Protection

#### Why

This is part of the practical control dimension of `7.5`.

#### Required Features

- branch-scoped access
- role-based access
- signed download URLs
- immutable version history
- audit events on access-sensitive actions

#### Exit Criteria

- unauthorized users cannot access files or metadata outside scope;
- sensitive events are audit logged.

### D5. Optional Read Acknowledgement

#### Recommendation

Include only if Sprint 6 is on track.

This is not required to launch the MVP, but it materially strengthens controlled-document governance.

## 9. Sprint Roadmap

## Sprint 0: Foundation and Delivery Setup

### Objective

Create the delivery baseline.

### Scope

- monorepo setup
- CI
- Docker Compose
- local PostgreSQL
- Cloudflare environments
- Workers app scaffold
- Vite app scaffold
- Drizzle schema baseline
- auth approach decision and implementation spike

### Deliverables

- deployable hello-world web + API
- database migration pipeline
- audit event utility
- RBAC guard middleware

### Exit Criteria

- local and Cloudflare environments both run;
- migration and deploy process is repeatable.

## Sprint 1: Organization, Auth, and Branch Core

### Objective

Ship tenant and branch foundations.

### Scope

- organizations
- users
- sessions
- roles
- branches CRUD
- headquarters rule
- branch manager assignment

### Compliance Contribution

- establishes controlled organizational scope for all later evidence

### Exit Criteria

- first organization and first branch can be created;
- branch hierarchy and permissions function correctly.

## Sprint 2: Collaborator Core

### Objective

Ship collaborator management as a stable operational registry.

### Scope

- collaborator CRUD
- branch assignment
- manager assignment
- role assignment
- list/detail/filter UI

### Compliance Contribution

- creates the people record base required for `7.2`, `7.3`, `7.1.6`

### Exit Criteria

- admins and branch managers can manage collaborator records in scope;
- audit events exist for all writes.

## Sprint 3: Positions and Required Competencies

### Objective

Implement the minimum `7.2.a` model.

### Scope

- positions CRUD
- competencies CRUD
- position competency requirements
- collaborator position assignment
- branch-position filters

### Compliance Contribution

- determines competencies required for people affecting system performance

### Exit Criteria

- every governed position can declare required competencies and evidence expectations;
- collaborator gap view is possible.

## Sprint 4: Competence Evidence and Development Actions

### Objective

Implement minimum `7.2.b` and `7.2.c`.

### Scope

- evidence of education
- evidence of experience
- certification records
- collaborator competence assessments
- development actions
- effectiveness review

### Compliance Contribution

- ensures competence can be demonstrated;
- provides actions when competence gaps exist;
- requires effectiveness evaluation for completed actions

### Exit Criteria

- at least one end-to-end flow exists from gap detection to action closure to effectiveness review.

## Sprint 5: Awareness and Organizational Knowledge

### Objective

Implement minimum `7.3` and `7.1.6`.

### Scope

- awareness items
- acknowledgements
- knowledge items
- links from knowledge items to controlled documents
- branch- and position-based assignment

### Compliance Contribution

- proves people were made aware of policy/objectives/contribution/nonconformity implications;
- identifies and controls knowledge required for effective operation

### Exit Criteria

- an auditor-style view can show:
  - what awareness item was assigned,
  - to whom,
  - when acknowledged,
  - what controlled knowledge source was linked.

## Sprint 6: Document Core and Controlled Documents

### Objective

Implement core `7.5` functionality.

### Scope

- document upload
- metadata
- branch scopes
- preview/download
- controlled/general split
- versions
- change summary
- document events

### Compliance Contribution

- creates the controlled documented-information backbone for processes

### Exit Criteria

- controlled documents can be published with version history and branch scope;
- system maintains an auditable current version.

## Sprint 7: Retention, Disposition, and Hardening

### Objective

Close the MVP with compliance-critical controls and production hardening.

### Scope

- retention rules
- archive/disposition workflow
- immutable audit paths
- authorization review
- pagination and performance optimization
- E2E tests
- observability
- production deployment hardening

### Compliance Contribution

- operationalizes the "maintain and retain" interpretation of `7.5`

### Exit Criteria

- no destructive uncontrolled delete path for retained records;
- Cloudflare production deployment is stable;
- UAT checklist is passed.

## 10. Compliance Gates by Clause

## 10.1 ISO 9001:2015 Item 7.5

The MVP is not ready for release unless all of the following exist:

- documented information registry
- controlled metadata
- versioning for controlled documents
- access control
- branch scope
- retention field/rule
- archive/disposition path
- audit trail

## 10.2 ISO 9001:2015 Item 7.2.a

The MVP is not ready for release unless:

- positions can define required competencies;
- collaborators can be assigned to positions;
- required competence can be queried by person and role.

## 10.3 ISO 9001:2015 Item 7.2.b

The MVP is not ready for release unless:

- education, experience, or training evidence can be recorded;
- competence assessments can be recorded;
- non-compliance against requirement can be detected.

## 10.4 ISO 9001:2015 Item 7.2.c

The MVP is not ready for release unless:

- competence gap actions can be created;
- actions can be completed;
- effectiveness can be reviewed and recorded.

## 10.5 ISO 9001:2015 Item 7.3

The MVP is not ready for release unless:

- awareness items can be assigned;
- acknowledgement can be recorded with timestamp and actor;
- policy/objectives/contribution/nonconformity implications are all representable.

## 10.6 ISO 9001:2015 Item 7.1.6

The MVP is not ready for release unless:

- required organizational knowledge can be identified;
- knowledge can be linked to controlled sources;
- the right people can access the right knowledge source.

## 11. Suggested Backlog Shape

Use these top-level epics:

- `EPIC-01 Platform Foundation`
- `EPIC-02 Branch Management`
- `EPIC-03 Collaborator Registry`
- `EPIC-04 Positions and Competencies`
- `EPIC-05 Competence Evidence and Actions`
- `EPIC-06 Awareness and Organizational Knowledge`
- `EPIC-07 Document Management Core`
- `EPIC-08 Controlled Documents and Retention`
- `EPIC-09 Security, Audit, and Hardening`
- `EPIC-10 Cloudflare Deployment and Operations`

## 12. Testing Strategy by Sprint

### Minimum Standard

Every sprint must include:

- unit tests for business rules
- API integration tests for auth and authorization
- one UI smoke flow

### Mandatory E2E Flows Before Launch

- create branch, assign manager
- create collaborator, assign position and branch
- define competency requirement
- record competence evidence
- create development action and effectiveness review
- assign awareness item and acknowledge it
- upload controlled document, create version 2, archive document

## 13. Release Definition of Done

The MVP is release-ready only if:

- Cloudflare production deployment is working;
- data model and migrations are stable;
- the three modules are usable end-to-end;
- the listed ISO-aligned gates are satisfied in product behavior;
- audit evidence can be exported or queried;
- no core flow depends on manual database intervention.

## 14. Key Risks

### Risk 1: Under-scoping the Social module

If collaborators are treated as directory-only, the product will not meaningfully support `7.2`, `7.3`, or `7.1.6`.

### Risk 2: Under-scoping the Document module

If documents are treated as file storage only, the product will not meaningfully support `7.5`.

### Risk 3: Overbuilding training too early

The roadmap should support competence actions without turning the MVP into a full LMS.

### Risk 4: Cloudflare-unfriendly backend choices

Using a Node-server-first design will slow delivery and complicate deployment.

## 15. Recommendation Summary

Build the MVP in this order:

1. foundation
2. branches
3. collaborators
4. positions and competencies
5. competence evidence and actions
6. awareness and organizational knowledge
7. documents
8. retention, hardening, release

This order is the shortest path to a production-ready Cloudflare deployment that also gives you a credible ISO-aligned operational foundation.

## 16. Sources

Official and guidance sources used for this roadmap:

- ISO 9001 standard page: https://www.iso.org/standard/62085.html
- ISO 9001 “How to use it”: https://www.iso.org/files/live/sites/tc176sc2/files/documents/iso_9001-2015_-_how_to_use_it.pdf.pdf
- ISO implementation guidance: https://www.iso.org/files/live/sites/isoorg/files/standards/docs/en/iso_9001_implement_guidance.pdf
- ISO/IAF APG guidance on organizational knowledge: https://committee.iso.org/files/live/sites/tc176/files/PDF%20APG%20New%20Disclaimer%2012-2023/ISO-TC%20176-TF_APG-OrganizationalKnowledge2015.pdf
- NQA gap guide summary for support clauses: https://www.nqa.com/medialibraries/NQA/NQA-Media-Library/PDFs/NQA-ISO-9001-2015-Gap-Guide.pdf

Repo-internal supporting analysis:

- [req-normativo-ISO-9001-2015-item-7-5.md](/Users/webstar/Documents/projects/daton/daton-esg-insight/docs/compliance-reports/done/req-normativo-ISO-9001-2015-item-7-5.md)
- [req-normativo-ISO-9001-2015-item-7-2.md](/Users/webstar/Documents/projects/daton/daton-esg-insight/docs/compliance-reports/req-normativo-ISO-9001-2015-item-7-2.md)
- [req-normativo-ISO-9001-2015-item-7-2-b.md](/Users/webstar/Documents/projects/daton/daton-esg-insight/docs/compliance-reports/req-normativo-ISO-9001-2015-item-7-2-b.md)
