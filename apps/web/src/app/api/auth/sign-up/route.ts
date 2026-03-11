import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createDatonSessionPayload,
  refreshWorkOsAuthentication,
} from "@daton/auth";
import { createBootstrapOrganizationSchema } from "@daton/contracts";

import {
  clearDatonSessionCookie,
  authenticateBrowserPassword,
  fetchSessionContext,
  getDatonSessionFromCookieStore,
  getWorkOsManagementEnv,
  readRequestMeta,
  refreshDatonSessionIfNeeded,
  setDatonSessionCookie,
} from "@/lib/auth-session";
import { toInternalApiUrl } from "@/lib/config";

const parseBootstrapInput = createBootstrapOrganizationSchema();

const bootstrapResponseSchema = z.object({
  member: z.object({
    id: z.string(),
    userId: z.string(),
    fullName: z.string(),
    email: z.email(),
    status: z.enum(["active", "inactive"]),
  }),
  organization: z.object({
    id: z.string(),
    legalName: z.string(),
    tradeName: z.string().nullable(),
    legalIdentifier: z.string(),
    openingDate: z.string().nullable(),
    taxRegime: z.string().nullable(),
    primaryCnae: z.string().nullable(),
    stateRegistration: z.string().nullable(),
    municipalRegistration: z.string().nullable(),
    onboardingData: z.object({
      company_profile: z.null(),
    }),
    onboardingStatus: z.enum(["pending", "completed", "skipped"]),
  }),
  workosOrganizationId: z.string(),
  workosUserId: z.string(),
});

export async function POST(request: Request) {
  try {
    const input = parseBootstrapInput.parse(await request.json());
    const currentSession = await getDatonSessionFromCookieStore();
    const refreshedSession = await refreshDatonSessionIfNeeded(currentSession, request.headers);

    if (currentSession && !refreshedSession.payload) {
      const response = NextResponse.json(
        {
          message: "Autenticação obrigatória.",
        },
        { status: 401 },
      );
      clearDatonSessionCookie(response);
      return response;
    }

    const upstreamHeaders = new Headers({
      "content-type": "application/json",
    });

    if (refreshedSession.payload) {
      upstreamHeaders.set("authorization", `Bearer ${refreshedSession.payload.accessToken}`);
    }

    const bootstrapResponse = await fetch(toInternalApiUrl("/api/v1/bootstrap/organization"), {
      body: JSON.stringify(input),
      cache: "no-store",
      headers: upstreamHeaders,
      method: "POST",
    });
    const bootstrapRawPayload = await bootstrapResponse.json().catch(() => null);

    if (!bootstrapResponse.ok) {
      const message =
        typeof bootstrapRawPayload === "object" &&
        bootstrapRawPayload &&
        "message" in bootstrapRawPayload &&
        typeof bootstrapRawPayload.message === "string"
          ? bootstrapRawPayload.message
          : "Não foi possível criar o ambiente agora.";
      return NextResponse.json(
        {
          message,
        },
        { status: bootstrapResponse.status },
      );
    }

    const bootstrapPayload = bootstrapResponseSchema.parse(bootstrapRawPayload);

    let sessionPayload;

    if (refreshedSession.payload) {
      const authentication = await refreshWorkOsAuthentication(getWorkOsManagementEnv(), {
        ...readRequestMeta(request.headers),
        organizationId: bootstrapPayload.workosOrganizationId,
        refreshToken: refreshedSession.payload.refreshToken,
      });
      sessionPayload = createDatonSessionPayload(authentication);
    } else {
      if (!input.password) {
        throw new Error("A senha inicial é obrigatória para criar o ambiente.");
      }

      let authentication = await authenticateBrowserPassword(
        {
          email: input.adminEmail,
          password: input.password,
        },
        request.headers,
      );

      if (authentication.organizationId !== bootstrapPayload.workosOrganizationId) {
        authentication = await refreshWorkOsAuthentication(getWorkOsManagementEnv(), {
          ...readRequestMeta(request.headers),
          organizationId: bootstrapPayload.workosOrganizationId,
          refreshToken: authentication.refreshToken,
        });
      }

      sessionPayload = createDatonSessionPayload(authentication);
    }

    const sessionContext = await fetchSessionContext(sessionPayload.accessToken);
    const response = NextResponse.json({
      redirectTo: sessionContext.session.organization
        ? "/onboarding/organization"
        : "/auth?mode=sign-up",
    });
    await setDatonSessionCookie(response, sessionPayload);

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível criar o ambiente agora.",
      },
      { status: 400 },
    );
  }
}
