import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { classifyWorkOsUserFacingError } from "@daton/auth";

import {
  authenticateBrowserEmailVerification,
  clearPendingEmailVerificationCookie,
  completeBrowserAuthentication,
  getPendingEmailVerificationFromCookieStore,
  isWorkOsAuthenticationFailure,
  setDatonSessionCookie,
} from "@/lib/auth-session";

const verifyEmailInputSchema = z.object({
  code: z.string().trim().min(1).max(32),
});

const getVerificationMissingResponse = () =>
  NextResponse.json(
    {
      message:
        "Não foi possível retomar a verificação do e-mail. Reinicie o acesso.",
    },
    { status: 400 },
  );

export async function POST(request: Request) {
  const pendingVerification = await getPendingEmailVerificationFromCookieStore();

  if (!pendingVerification) {
    return getVerificationMissingResponse();
  }

  try {
    const input = verifyEmailInputSchema.parse(await request.json());
    const authentication = await authenticateBrowserEmailVerification(
      {
        code: input.code,
        pendingAuthenticationToken:
          pendingVerification.pendingAuthenticationToken,
      },
      request.headers,
    );
    const { sessionContext, sessionPayload } = await completeBrowserAuthentication(
      authentication,
      request.headers,
      {
        targetWorkosOrganizationId:
          pendingVerification.targetWorkosOrganizationId,
      },
    );

    const response = NextResponse.json({
      redirectTo:
        pendingVerification.flow === "sign-up"
          ? sessionContext.session.organization
            ? "/onboarding/organization"
            : "/auth?mode=sign-up"
          : sessionContext.session.organization
            ? "/app"
            : "/auth?mode=sign-up",
      status: "authenticated",
    });
    clearPendingEmailVerificationCookie(response);
    await setDatonSessionCookie(response, sessionPayload);

    return response;
  } catch (error) {
    const classified = classifyWorkOsUserFacingError(error, "sign-in");

    if (classified.isExpected || isWorkOsAuthenticationFailure(error)) {
      Sentry.withScope((scope) => {
        scope.setTag("auth.error_kind", classified.kind);
        scope.setTag("auth.flow", pendingVerification.flow);
        scope.setTag("auth.step", "email_verification");
        Sentry.captureException(error);
      });
    }

    return NextResponse.json(
      {
        message: classified.isExpected
          ? classified.message
          : error instanceof Error
            ? error.message
            : "Não foi possível concluir a verificação do e-mail agora.",
      },
      { status: classified.isExpected ? 400 : 500 },
    );
  }
}

export async function DELETE() {
  const pendingVerification = await getPendingEmailVerificationFromCookieStore();
  const response = NextResponse.json({
    redirectTo: `/auth?mode=${pendingVerification?.flow ?? "sign-in"}`,
  });

  clearPendingEmailVerificationCookie(response);

  return response;
}
