import { headers } from "next/headers";
import { z } from "zod";

import {
  branchSummarySchema,
  sessionResponseSchema,
  type BranchSummary,
  type SessionResponse,
} from "@daton/contracts";

import { toInternalApiUrl } from "./config";

const branchListSchema = z.array(branchSummarySchema);

type ServerFetchOptions = RequestInit & {
  allowUnauthorized?: boolean;
};

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

export async function serverApiFetch<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: ServerFetchOptions,
) {
  const headerStore = await headers();
  const requestHeaders = new Headers(init?.headers);
  const cookieHeader = headerStore.get("cookie");

  if (cookieHeader) {
    requestHeaders.set("cookie", cookieHeader);
  }

  const response = await fetch(toInternalApiUrl(path), {
    ...init,
    headers: requestHeaders,
    cache: "no-store",
  });

  if (init?.allowUnauthorized && response.status === 401) {
    return null;
  }

  return parseResponse(response, schema);
}

export const getServerSession = async () =>
  serverApiFetch("/api/v1/session", sessionResponseSchema, { allowUnauthorized: true });

export const getServerBranches = async () =>
  serverApiFetch("/api/v1/branches", branchListSchema, { allowUnauthorized: false });

export const getServerBranch = async (branchId: string) =>
  serverApiFetch(`/api/v1/branches/${branchId}`, branchSummarySchema, { allowUnauthorized: false });

export type ServerSession = SessionResponse;
export type ServerBranch = BranchSummary;
