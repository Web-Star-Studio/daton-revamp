import type { z } from "zod";

import {
  branchSummarySchema,
  createBootstrapOrganizationSchema,
  createCreateBranchSchema,
  createUpdateBranchSchema,
  type BootstrapOrganizationInput,
  type BranchSummary,
  type CreateBranchInput,
  type UpdateBranchInput,
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

export type ServerBranch = BranchSummary;
export const apiBaseUrl = resolvePublicApiBaseUrl();
