import type { z } from "zod";

import {
  branchSummarySchema,
  createBootstrapOrganizationSchema,
  createCreateBranchSchema,
  createCreateDepartmentSchema,
  organizationSummarySchema,
  createUpdateBranchSchema,
  createUpdateDepartmentSchema,
  departmentSummarySchema,
  updateOrganizationSchema,
  type BootstrapOrganizationInput,
  type BranchSummary,
  type CreateBranchInput,
  type CreateDepartmentInput,
  type DepartmentSummary,
  type UpdateOrganizationInput,
  type UpdateBranchInput,
  type UpdateDepartmentInput,
} from "@daton/contracts";

import { resolvePublicApiBaseUrl, toApiUrl } from "./config";

type ClientFetchOptions = RequestInit & {
  schema?: z.ZodTypeAny;
};

const loopbackHosts = new Set(["127.0.0.1", "localhost"]);

const allowFictionalCnpjInClient = () =>
  typeof window !== "undefined" && loopbackHosts.has(window.location.hostname);

async function parseResponse<T>(response: Response, schema?: z.ZodType<T>) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "string"
        ? payload
        : (payload as { message?: string } | null)?.message ?? "A solicitação falhou.";
    throw new Error(message);
  }

  return schema ? schema.parse(payload) : payload;
}

export async function clientApiFetch<T>(path: string, init: ClientFetchOptions = {}) {
  const response = await fetch(toApiUrl(path), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
    credentials: "include",
  });

  return parseResponse(response, init.schema as z.ZodType<T> | undefined);
}

export async function bootstrapOrganization(input: BootstrapOrganizationInput) {
  const payload = createBootstrapOrganizationSchema({
    allowFictional: allowFictionalCnpjInClient(),
  }).parse(input);

  return clientApiFetch("/api/v1/bootstrap/organization", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createBranch(input: CreateBranchInput) {
  const payload = createCreateBranchSchema({
    allowFictional: allowFictionalCnpjInClient(),
  }).parse(input);

  return clientApiFetch("/api/v1/branches", {
    method: "POST",
    body: JSON.stringify(payload),
    schema: branchSummarySchema,
  });
}

export async function updateBranch(branchId: string, input: UpdateBranchInput) {
  const payload = createUpdateBranchSchema({
    allowFictional: allowFictionalCnpjInClient(),
  }).parse(input);

  return clientApiFetch(`/api/v1/branches/${branchId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    schema: branchSummarySchema,
  });
}

export async function createDepartment(input: CreateDepartmentInput) {
  const payload = createCreateDepartmentSchema().parse(input);

  return clientApiFetch("/api/v1/departments", {
    method: "POST",
    body: JSON.stringify(payload),
    schema: departmentSummarySchema,
  });
}

export async function updateDepartment(
  departmentId: string,
  input: UpdateDepartmentInput,
) {
  const payload = createUpdateDepartmentSchema().parse(input);

  return clientApiFetch(`/api/v1/departments/${departmentId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    schema: departmentSummarySchema,
  });
}

export async function updateOrganization(input: UpdateOrganizationInput) {
  const payload = updateOrganizationSchema.parse(input);

  return clientApiFetch("/api/v1/organization", {
    method: "PATCH",
    body: JSON.stringify(payload),
    schema: organizationSummarySchema,
  });
}

export type ServerBranch = BranchSummary;
export type ServerDepartment = DepartmentSummary;
export const apiBaseUrl = resolvePublicApiBaseUrl();
