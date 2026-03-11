import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  classifyWorkOsUserFacingError,
  extractWorkOsEmailVerificationRequiredPayload,
  refreshWorkOsAuthentication,
} from "@daton/auth";
import { createBootstrapOrganizationSchema } from "@daton/contracts";

import {
  clearDatonSessionCookie,
  clearPendingEmailVerificationCookie,
  authenticateBrowserPassword,
  completeBrowserAuthentication,
  getDatonSessionFromCookieStore,
  getWorkOsManagementEnv,
  readRequestMeta,
  refreshDatonSessionIfNeeded,
  setPendingEmailVerificationCookie,
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
  let input: z.infer<typeof parseBootstrapInput> | null = null;
  let bootstrapPayload: z.infer<typeof bootstrapResponseSchema> | null = null;

  try {
    input = parseBootstrapInput.parse(await request.json());
    const currentSession = await getDatonSessionFromCookieStore();
    const refreshedSession = await refreshDatonSessionIfNeeded(
      currentSession,
      request.headers,
    );

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
      upstreamHeaders.set(
        "authorization",
        `Bearer ${refreshedSession.payload.accessToken}`,
      );
    }

    const bootstrapResponse = await fetch(
      toInternalApiUrl("/api/v1/bootstrap/organization"),
      {
        body: JSON.stringify(input),
        cache: "no-store",
        headers: upstreamHeaders,
        method: "POST",
      },
    );
    const bootstrapRawPayload = await bootstrapResponse
      .json()
      .catch(() => null);

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

    bootstrapPayload = bootstrapResponseSchema.parse(bootstrapRawPayload);

    const refreshedPayload = refreshedSession.payload;
    const { sessionContext, sessionPayload } = refreshedPayload
      ? await (async () => {
          const authentication = await refreshWorkOsAuthentication(
            getWorkOsManagementEnv(),
            {
              ...readRequestMeta(request.headers),
              organizationId: bootstrapPayload.workosOrganizationId,
              refreshToken: refreshedPayload.refreshToken,
            },
          );

          return completeBrowserAuthentication(authentication, request.headers);
        })()
      : await (async () => {
          if (!input.password) {
            throw new Error("A senha inicial é obrigatória para criar o ambiente.");
          }

          const authentication = await authenticateBrowserPassword(
            {
              email: input.adminEmail,
              password: input.password,
            },
            request.headers,
          );

          return completeBrowserAuthentication(authentication, request.headers, {
            targetWorkosOrganizationId: bootstrapPayload.workosOrganizationId,
          });
        })();

    const response = NextResponse.json({
      status: "authenticated",
      redirectTo: sessionContext.session.organization
        ? "/onboarding/organization"
        : "/auth?mode=sign-up",
    });
    clearPendingEmailVerificationCookie(response);
    await setDatonSessionCookie(response, sessionPayload);

    return response;
  } catch (error) {
    const classified = classifyWorkOsUserFacingError(error, "sign-in");

    if (
      classified.kind === "email_verification_required" &&
      input
    ) {
      const payload = extractWorkOsEmailVerificationRequiredPayload(error);

      if (payload) {
        Sentry.withScope((scope) => {
          scope.setTag("auth.error_kind", classified.kind);
          scope.setTag("auth.flow", "sign-up");
          scope.setTag("auth.step", "password");
          Sentry.captureException(error);
        });

        const response = NextResponse.json({
          email: input.adminEmail,
          flow: "sign-up",
          message: classified.message,
          status: "verification_required",
        });
        await setPendingEmailVerificationCookie(response, {
          email: input.adminEmail,
          emailVerificationId: payload.emailVerificationId,
          flow: "sign-up",
          pendingAuthenticationToken: payload.pendingAuthenticationToken,
          targetWorkosOrganizationId: bootstrapPayload?.workosOrganizationId ?? null,
        });

        return response;
      }
    }

    if (classified.isExpected) {
      Sentry.withScope((scope) => {
        scope.setTag("auth.error_kind", classified.kind);
        scope.setTag("auth.flow", "sign-up");
        scope.setTag("auth.step", bootstrapPayload ? "password" : "bootstrap");
        Sentry.captureException(error);
      });
    }

    return NextResponse.json(
      {
        message: classified.isExpected
          ? classified.message
          : error instanceof Error
            ? error.message
            : "Não foi possível criar o ambiente agora.",
      },
      { status: 400 },
    );
  }
}
