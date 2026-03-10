import { headers } from "next/headers";
import { z } from "zod";

import {
  branchSummarySchema,
  employeeListSchema,
  employeeSummarySchema,
  departmentListSchema,
  positionListSchema,
  positionSummarySchema,
  notificationListSchema,
  organizationDirectoryMemberListSchema,
  sessionResponseSchema,
  type BranchSummary,
  type EmployeeSummary,
  type DepartmentSummary,
  type NotificationSummary,
  type OrganizationDirectoryMember,
  type PositionSummary,
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

export const getServerOrganizationMembers = async () =>
  serverApiFetch("/api/v1/members", organizationDirectoryMemberListSchema, {
    allowUnauthorized: false,
  });

export const getServerEmployees = async () =>
  serverApiFetch("/api/v1/employees", employeeListSchema, {
    allowUnauthorized: false,
  });

export const getServerEmployee = async (employeeId: string) =>
  serverApiFetch(`/api/v1/employees/${employeeId}`, employeeSummarySchema, {
    allowUnauthorized: false,
  });

export const getServerPositions = async () =>
  serverApiFetch("/api/v1/positions", positionListSchema, {
    allowUnauthorized: false,
  });

export const getServerPosition = async (positionId: string) =>
  serverApiFetch(`/api/v1/positions/${positionId}`, positionSummarySchema, {
    allowUnauthorized: false,
  });

export const getServerDepartments = async () =>
  serverApiFetch("/api/v1/departments", departmentListSchema, {
    allowUnauthorized: false,
  });

export const getServerNotifications = async () =>
  serverApiFetch("/api/v1/notifications", notificationListSchema, {
    allowUnauthorized: false,
  });

export type ServerSession = SessionResponse;
export type ServerBranch = BranchSummary;
export type ServerOrganizationMember = OrganizationDirectoryMember;
export type ServerDepartment = DepartmentSummary;
export type ServerEmployee = EmployeeSummary;
export type ServerPosition = PositionSummary;
export type ServerNotification = NotificationSummary;
