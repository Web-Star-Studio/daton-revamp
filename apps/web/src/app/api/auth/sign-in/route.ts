import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  extractWorkOsEmailVerificationRequiredPayload,
} from "@daton/auth";

import {
  clearPendingEmailVerificationCookie,
  completeBrowserAuthentication,
  authenticateBrowserPassword,
  isWorkOsAuthenticationFailure,
  setPendingEmailVerificationCookie,
  setDatonSessionCookie,
} from "@/lib/auth-session";
import { getSignInFailureResult } from "@/lib/sign-in-failure";

const signInInputSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  let input: z.infer<typeof signInInputSchema> | null = null;

  try {
    input = signInInputSchema.parse(await request.json());
    const authentication = await authenticateBrowserPassword(
      input,
      request.headers,
    );
    const { sessionContext, sessionPayload } = await completeBrowserAuthentication(
      authentication,
      request.headers,
    );

    const response = NextResponse.json({
      status: "authenticated",
      redirectTo: sessionContext.session.organization
        ? "/app"
        : "/auth?mode=sign-up",
    });
    clearPendingEmailVerificationCookie(response);
    await setDatonSessionCookie(response, sessionPayload);

    return response;
  } catch (error) {
    const failure = getSignInFailureResult(error);

    if (
      failure.classified.kind === "email_verification_required" &&
      input
    ) {
      const payload = extractWorkOsEmailVerificationRequiredPayload(error);

      if (payload) {
        Sentry.withScope((scope) => {
          scope.setTag("auth.error_kind", failure.classified.kind);
          scope.setTag("auth.flow", "sign-in");
          scope.setTag("auth.step", "password");
          Sentry.captureException(error);
        });

        const response = NextResponse.json({
          email: input.email,
          flow: "sign-in",
          message: failure.message,
          status: "verification_required",
        });
        await setPendingEmailVerificationCookie(response, {
          email: input.email,
          emailVerificationId: payload.emailVerificationId,
          flow: "sign-in",
          pendingAuthenticationToken: payload.pendingAuthenticationToken,
          targetWorkosOrganizationId: null,
        });

        return response;
      }
    }

    if (failure.classified.isExpected || isWorkOsAuthenticationFailure(error)) {
      Sentry.withScope((scope) => {
        scope.setTag("auth.error_kind", failure.classified.kind);
        scope.setTag("auth.flow", "sign-in");
        scope.setTag("auth.step", "password");
        Sentry.captureException(error);
      });
    }

    return NextResponse.json(
      {
        message: failure.message,
      },
      { status: failure.status },
    );
  }
}
