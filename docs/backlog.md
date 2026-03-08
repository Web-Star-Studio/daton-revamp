# Aban Backlog: Epics, User Stories, and Acceptance Criteria

Date: 2026-03-07
Status: Draft
Depends on:
- [prd-mvp-core-platform.md](/Users/webstar/Documents/projects/daton/daton-esg-insight/docs/prd-mvp-core-platform.md)
- [implementation-roadmap-iso-aligned.md](/Users/webstar/Documents/projects/daton/daton-esg-insight/docs/implementation-roadmap-iso-aligned.md)

## 1. Purpose

This document translates the MVP PRD and ISO-aligned roadmap into a delivery backlog that can be created directly in Aban.

It is organized by:

- Epic
- Sprint target
- ISO alignment
- User stories
- Acceptance criteria

## 2. Recommended Aban Structure

Create the following hierarchy in Aban:

- Initiative: `Core Platform MVP`
- Epics: `EPIC-01` to `EPIC-10`
- Stories: `US-xxx`
- Tasks: technical implementation tasks under each story

Recommended labels:

- `mvp`
- `cloudflare`
- `backend`
- `frontend`
- `db`
- `security`
- `iso-7.5`
- `iso-7.2a`
- `iso-7.2b`
- `iso-7.2c`
- `iso-7.3`
- `iso-7.1.6`

Recommended workflow states:

- `Backlog`
- `Ready`
- `In Progress`
- `In Review`
- `Done`

## 3. Epic Summary

| Epic ID | Epic Name | Sprint Target | ISO Alignment |
| --- | --- | --- | --- |
| `EPIC-01` | Platform Foundation | `Sprint 0-1` | indirect support |
| `EPIC-02` | Branch Management | `Sprint 1` | indirect support |
| `EPIC-03` | Collaborator Registry | `Sprint 2` | supports `7.2`, `7.3`, `7.1.6` |
| `EPIC-04` | Positions and Competencies | `Sprint 3` | `7.2.a` |
| `EPIC-05` | Competence Evidence and Actions | `Sprint 4` | `7.2.b`, `7.2.c` |
| `EPIC-06` | Awareness and Organizational Knowledge | `Sprint 5` | `7.3`, `7.1.6` |
| `EPIC-07` | Document Management Core | `Sprint 6` | `7.5` |
| `EPIC-08` | Controlled Documents and Retention | `Sprint 7` | `7.5` |
| `EPIC-09` | Security, Audit, and Hardening | `Sprint 6-7` | cross-cutting |
| `EPIC-10` | Cloudflare Deployment and Operations | `Sprint 0, 7` | cross-cutting |

## 4. Epic Details

## EPIC-01 Platform Foundation

### Goal

Establish the tenant, auth, RBAC, audit, and delivery foundation required by all other modules.

### Stories

#### `US-001` Organization and Initial Admin Setup

As a platform owner, I want to create an organization with an initial admin account so that the tenant can start using the system securely.

Acceptance criteria:

- an organization can be created with legal name, trade name, and legal identifier;
- an initial admin user is created in the same flow;
- the initial admin is linked to the created organization;
- duplicate organization identifiers are blocked;
- the action creates an audit event.

#### `US-002` Email and Password Authentication

As a user, I want to authenticate with email and password so that I can securely access my organization workspace.

Acceptance criteria:

- users can log in with valid credentials;
- invalid credentials return safe error responses;
- authenticated sessions are persisted securely;
- logout invalidates the active session;
- all auth responses are organization-safe and do not leak cross-tenant information.

#### `US-003` Role-Based Access Control

As an admin, I want role-based permissions so that each user can access only the data and actions they are allowed to use.

Acceptance criteria:

- roles `owner`, `admin`, `hr_admin`, `branch_manager`, `document_controller`, `collaborator`, and `viewer` exist;
- permissions are enforced in backend handlers, not only in the UI;
- unauthorized actions return `403`;
- role assignments are auditable;
- branch-scoped roles can be applied where required.

#### `US-004` Audit Event Framework

As a compliance-conscious organization, I want important actions to generate audit events so that operational evidence is preserved.

Acceptance criteria:

- create, update, archive, and access-sensitive actions can emit audit events;
- each audit event records actor, organization, entity type, entity ID, action, timestamp, and metadata;
- audit events are queryable by entity and actor;
- audit records cannot be changed through standard UI flows.

## EPIC-02 Branch Management

### Goal

Model the organization’s branch structure and provide the scope boundary for collaborators, knowledge, and documents.

### Stories

#### `US-005` Create and Edit Branch

As an admin, I want to create and edit branches so that the organization structure is represented accurately.

Acceptance criteria:

- a branch can be created with name, code, legal identifier, email, phone, and address;
- branch code is unique within an organization;
- branch changes are audit logged;
- archived branches are excluded from default active lists.

#### `US-006` Define Headquarters and Hierarchy

As an admin, I want to define headquarters and branch hierarchy so that the platform reflects the operational structure.

Acceptance criteria:

- one and only one active headquarters exists per organization;
- a branch can optionally reference a parent branch;
- cyclic hierarchy is blocked;
- hierarchy can be queried for filters and access rules.

#### `US-007` Assign Branch Manager

As an admin, I want to assign a branch manager so that responsibility is explicit for each branch.

Acceptance criteria:

- a branch manager can be assigned to an active collaborator;
- manager assignment history is preserved;
- the assigned branch manager receives scoped access according to policy;
- reassignment produces an audit event.

#### `US-008` Archive Branch Safely

As an admin, I want to archive branches instead of deleting them so that historical references remain valid.

Acceptance criteria:

- active branches with linked collaborators or documents cannot be hard deleted;
- archive action requires confirmation;
- archived branches remain available in historical records;
- archived branches cannot receive new active assignments unless restored.

## EPIC-03 Collaborator Registry

### Goal

Provide the core collaborator registry that later competence, awareness, and knowledge controls depend on.

### Stories

#### `US-009` Create and Maintain Collaborator Profile

As an HR admin, I want to create and maintain collaborator records so that the organization has a reliable people registry.

Acceptance criteria:

- collaborator profiles include internal code, full name, email, phone, government identifier, hire date, status, department, and notes;
- collaborator email is unique within the organization when used as a login identifier;
- profile changes are auditable;
- inactive collaborators remain historically queryable.

#### `US-010` Assign Primary Branch and Manager

As an HR admin, I want to assign a primary branch and manager to a collaborator so that reporting lines and branch scope are explicit.

Acceptance criteria:

- every active collaborator can have one primary branch;
- collaborator manager can be assigned to another active collaborator;
- manager self-reference is blocked;
- branch assignment history is preserved.

#### `US-011` Assign Application Roles to Collaborators

As an admin, I want to assign one or more application roles to collaborators so that access reflects operational responsibility.

Acceptance criteria:

- one collaborator can hold multiple roles if policy allows;
- role assignment can optionally include branch scope;
- role removal does not erase historical audit evidence;
- effective permissions are testable through API authorization checks.

#### `US-012` Search and Filter Collaborators

As an HR admin or branch manager, I want to search and filter collaborators so that I can quickly find the right records.

Acceptance criteria:

- collaborator list supports filters by branch, manager, role, department, and status;
- text search works by name, email, and internal code;
- branch managers only see collaborators in their scope;
- API pagination and sorting are available.

## EPIC-04 Positions and Competencies

### Goal

Establish the competence requirements expected for positions affecting system performance.

### Stories

#### `US-013` Create and Manage Positions

As an HR admin, I want to create and manage positions so that collaborators can be evaluated against defined requirements.

Acceptance criteria:

- positions can be created with title, code, department, description, and active status;
- positions can be archived without deleting history;
- active collaborators can be assigned to active positions;
- position changes are audit logged.

#### `US-014` Define Competency Catalog

As an HR admin, I want a competency catalog so that requirements are standardized and reusable across positions.

Acceptance criteria:

- competencies can be grouped by category;
- competencies can define expected evidence type;
- competencies can define expected level or threshold;
- archived competencies remain visible in historical assignments.

#### `US-015` Define Position Competency Requirements

As an HR admin, I want to define required competencies per position so that the organization can determine expected competence for each role.

Acceptance criteria:

- a position can define one or more required competencies;
- each requirement can include required level, evidence expectation, and optional review cadence;
- required competencies are queryable by position, collaborator, and branch;
- requirement changes are audit logged.

#### `US-016` View Collaborator Competency Gap

As an HR admin or manager, I want to compare collaborator records against position requirements so that competence gaps are visible.

Acceptance criteria:

- the system can show missing or incomplete requirements for a collaborator;
- the gap view reflects current position assignment;
- the gap view distinguishes compliant, partially compliant, and non-compliant states;
- the gap view can be filtered by branch and position.

ISO alignment:

- `US-013` to `US-016` satisfy the implementation baseline for `ISO 9001:2015 item 7.2.a`.

## EPIC-05 Competence Evidence and Actions

### Goal

Allow the organization to demonstrate competence evidence and act on identified gaps.

### Stories

#### `US-017` Record Education, Experience, and Certification Evidence

As an HR admin, I want to record competence evidence so that the organization can demonstrate why a collaborator is qualified.

Acceptance criteria:

- evidence records support education, experience, and certification types;
- evidence can include metadata and optional file attachment;
- evidence is linked to a collaborator and organization;
- evidence changes are audit logged.

#### `US-018` Record Competence Assessment Result

As an HR admin or manager, I want to record an assessment result so that the collaborator’s current competence status is explicit.

Acceptance criteria:

- an assessment can be recorded against a collaborator and a specific requirement;
- assessment status supports `compliant`, `partially_compliant`, and `not_compliant`;
- assessment record includes assessor, date, and notes;
- assessments are historically preserved.

#### `US-019` Create Development Action from a Gap

As an HR admin or manager, I want to create a development action when a competence gap exists so that the collaborator can acquire the needed competence.

Acceptance criteria:

- a development action can be created from a detected gap or manually;
- action includes owner, due date, related collaborator, and related requirement;
- action status supports open, in progress, completed, and cancelled;
- cancelled actions require a reason.

#### `US-020` Review Effectiveness of Development Action

As an HR admin or manager, I want to record effectiveness after an action is completed so that the organization can evaluate whether the action worked.

Acceptance criteria:

- completed actions cannot be closed permanently without effectiveness review;
- effectiveness review includes reviewer, date, outcome, and notes;
- outcome supports effective, partially effective, and not effective;
- effectiveness review updates the related gap status when applicable.

ISO alignment:

- `US-017` and `US-018` support `ISO 9001:2015 item 7.2.b`.
- `US-019` and `US-020` support `ISO 9001:2015 item 7.2.c`.

## EPIC-06 Awareness and Organizational Knowledge

### Goal

Provide evidence that people are aware of relevant management-system expectations and that required organizational knowledge is controlled.

### Stories

#### `US-021` Publish Awareness Item

As an admin or quality lead, I want to publish awareness items so that relevant people can be informed about policy, objectives, contribution, and nonconformity implications.

Acceptance criteria:

- awareness items support title, type, content, effective date, and optional due date;
- awareness types include policy, objectives summary, role contribution, nonconformity implications, and mandatory communication;
- awareness items can be targeted by branch, role, or named collaborator;
- publication creates an audit event.

#### `US-022` Acknowledge Awareness Item

As a collaborator, I want to acknowledge awareness items assigned to me so that the organization can prove I received and confirmed the communication.

Acceptance criteria:

- assigned collaborators can acknowledge awareness items;
- acknowledgement records timestamp, actor, and source context;
- duplicate active acknowledgements for the same assignment are prevented;
- managers can report pending acknowledgements by branch.

#### `US-023` Define Organizational Knowledge Item

As an admin or quality lead, I want to define required knowledge items so that necessary operational knowledge is mapped and controlled.

Acceptance criteria:

- knowledge items support title, description, scope, branch scope, and applicable positions or processes;
- knowledge items can be active or archived;
- each knowledge item can link to one or more controlled source documents;
- unavailable or archived source links are visible as exceptions.

#### `US-024` Link Knowledge Requirements to Positions

As an HR admin or quality lead, I want to link knowledge requirements to positions so that the right people can access the right knowledge source.

Acceptance criteria:

- a position can define one or more required knowledge items;
- required knowledge is visible from the collaborator profile through the assigned position;
- branch scope is respected in availability and access;
- missing controlled source links are reported.

ISO alignment:

- `US-021` and `US-022` support `ISO 9001:2015 item 7.3`.
- `US-023` and `US-024` support `ISO 9001:2015 item 7.1.6`.

## EPIC-07 Document Management Core

### Goal

Deliver the core documented-information registry with branch-aware access and auditable handling.

### Stories

#### `US-025` Upload and Register Document

As a document controller, I want to upload and register a document so that the organization can centralize documented information.

Acceptance criteria:

- a document can be uploaded to object storage and registered in the database;
- document metadata includes title, file name, type, confidentiality level, owner, and status;
- document belongs to one organization and can be scoped to one or more branches;
- document creation generates audit events.

#### `US-026` Search and Filter Documents

As a user with permission, I want to search and filter documents so that I can quickly find the information I need.

Acceptance criteria:

- document list supports filters by type, status, branch, confidentiality, owner, and document class;
- text search works on title and metadata fields;
- results are permission-aware;
- pagination and sorting are available.

#### `US-027` Preview and Download Authorized Documents

As a user with permission, I want to preview and download documents so that I can use controlled information safely.

Acceptance criteria:

- authorized users can access preview or download actions;
- downloads use signed or otherwise protected access URLs;
- unauthorized access is blocked at the backend;
- access-sensitive actions are audit logged.

#### `US-028` Assign Branch Scope to Documents

As a document controller, I want to control branch scope on a document so that visibility matches operational applicability.

Acceptance criteria:

- a document can be linked to one or more branches;
- branch scope can be updated only by authorized roles;
- branch-scoped permissions are enforced consistently in API and UI;
- out-of-scope users cannot view protected metadata or files.

## EPIC-08 Controlled Documents and Retention

### Goal

Implement the controls required for documented information that must be maintained, retained, versioned, and dispositioned.

### Stories

#### `US-029` Classify Document as General or Controlled

As a document controller, I want to classify a document as general or controlled so that governance rules can be applied appropriately.

Acceptance criteria:

- each document can be classified as general, controlled, retained evidence, or both maintained and retained;
- controlled classification activates version control requirements;
- retained classification activates retention and disposition requirements;
- classification changes are audit logged.

#### `US-030` Create New Document Version

As a document controller, I want to create a new version of a controlled document so that revisions remain traceable.

Acceptance criteria:

- a controlled document can have multiple versions;
- one and only one version is marked current at a time;
- a new version requires version number, change summary, and effective date;
- prior versions remain immutable and accessible to authorized users.

#### `US-031` Define Retention and Disposition Rules

As a document controller or admin, I want to define retention information so that evidence is preserved for the required period.

Acceptance criteria:

- documents can store retention category, retention period, and disposition trigger;
- retained records cannot be hard deleted through standard flows;
- documents can move to archived or obsolete states according to policy;
- retention-related changes are auditable.

#### `US-032` Execute Disposition with Justification

As a privileged user, I want to execute document disposition with justification so that obsolete retained information is handled in a controlled way.

Acceptance criteria:

- disposition requires justification, actor, date, and target document reference;
- disposition preserves an immutable historical record;
- disposition is restricted to authorized roles;
- disposition reports can be queried for audit purposes.

ISO alignment:

- `US-025` to `US-032` define the MVP baseline for `ISO 9001:2015 item 7.5`.

## EPIC-09 Security, Audit, and Hardening

### Goal

Harden the MVP for production use and ensure critical controls are tested and observable.

### Stories

#### `US-033` Enforce Backend Authorization on All Protected Routes

As a platform owner, I want all protected actions to be enforced in the backend so that compliance does not depend on frontend behavior.

Acceptance criteria:

- protected API routes validate session, organization scope, role, and branch scope where applicable;
- authorization tests exist for positive and negative cases;
- unauthorized actions do not leak sensitive metadata;
- failures are observable through structured logs.

#### `US-034` Query Audit Events by Entity and Actor

As an admin or auditor, I want to query audit events so that operational evidence can be reviewed without database intervention.

Acceptance criteria:

- audit events can be filtered by date, actor, action, entity type, and entity ID;
- results are paginated;
- access to audit views is restricted by role;
- audit query performance is acceptable for MVP data volume.

#### `US-035` Deliver Mandatory E2E Business Flows

As the product team, I want mandatory E2E flows automated so that releases protect the most critical behaviors.

Acceptance criteria:

- automated E2E coverage exists for branch creation and manager assignment;
- automated E2E coverage exists for collaborator creation and assignment;
- automated E2E coverage exists for competence evidence and action workflow;
- automated E2E coverage exists for awareness acknowledgement and controlled document versioning.

## EPIC-10 Cloudflare Deployment and Operations

### Goal

Run the MVP on a Cloudflare-first stack with repeatable environments and operational visibility.

### Stories

#### `US-036` Local Docker Development Environment

As a developer, I want a local Docker-based environment so that the team can run the platform consistently.

Acceptance criteria:

- local PostgreSQL runs through Docker Compose;
- local app services start with documented commands;
- environment variable setup is documented;
- migrations can be applied locally in a repeatable way.

#### `US-037` Deploy Frontend and API to Cloudflare

As a platform owner, I want the frontend and API deployed to Cloudflare so that the MVP runs on the target production platform.

Acceptance criteria:

- frontend deploy target is configured;
- API deploy target is configured on Cloudflare Workers;
- production environment variables are managed securely;
- deployment process is repeatable and documented.

#### `US-038` Configure Production Storage and Database Connectivity

As a platform owner, I want production storage and database connectivity configured for Cloudflare so that documents and data are available securely.

Acceptance criteria:

- document storage is configured with Cloudflare R2;
- production database connectivity is configured through the chosen production path;
- secrets are not committed to the repository;
- storage and connectivity failures are observable.

#### `US-039` Add Basic Observability and Operational Alerts

As a platform owner, I want basic observability so that production failures can be detected and investigated quickly.

Acceptance criteria:

- structured logs exist for API errors and critical events;
- deployment health checks are defined;
- failed background or storage-related operations can be surfaced;
- production troubleshooting steps are documented.

## 5. Release Checklist Stories

Create these as final release-gate items in Aban:

#### `US-040` Release Readiness Review

As the product team, I want a release readiness review so that the MVP is not deployed without the agreed quality and compliance gates.

Acceptance criteria:

- all stories mapped to `7.2.a`, `7.2.b`, `7.2.c`, `7.3`, `7.1.6`, and `7.5` are complete or explicitly deferred by decision;
- all mandatory E2E flows pass in the release environment;
- no core user flow depends on manual database intervention;
- release sign-off is documented.

#### `US-041` Compliance Evidence Walkthrough

As the product team, I want an internal compliance walkthrough so that the system can demonstrate how required evidence is produced.

Acceptance criteria:

- the team can demonstrate competence requirement setup by position;
- the team can demonstrate competence evidence and action effectiveness review;
- the team can demonstrate awareness assignment and acknowledgement;
- the team can demonstrate controlled document versioning, retention, and auditability.

## 6. Suggested Aban Milestones

- `Milestone 1`: Foundation Ready
- `Milestone 2`: Branch and Collaborator Core Ready
- `Milestone 3`: Competence Model Ready
- `Milestone 4`: Awareness and Knowledge Ready
- `Milestone 5`: Document Control Ready
- `Milestone 6`: Production Release Ready

## 7. Notes for Grooming

- keep each story small enough to complete within one sprint;
- split UI, API, DB, and test tasks under each story instead of creating separate top-level stories for every technical layer;
- keep ISO mapping as labels, not only in story description;
- do not treat awareness, competence, or document retention as optional add-ons if the MVP is expected to support the listed clauses.
