import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { classifyWorkOsUserFacingError } from "@daton/auth";

import {
  getPendingEmailVerificationFromCookieStore,
  resendBrowserEmailVerification,
} from "@/lib/auth-session";

export async function POST() {
  const pendingVerification = await getPendingEmailVerificationFromCookieStore();

  if (!pendingVerification) {
    return NextResponse.json(
      {
        message:
          "Não foi possível reenviar o código agora. Reinicie o acesso.",
      },
      { status: 400 },
    );
  }

  try {
    await resendBrowserEmailVerification(
      pendingVerification.emailVerificationId,
    );

    return NextResponse.json({
      message: "Enviamos um novo código de verificação para o seu e-mail.",
    });
  } catch (error) {
    const classified = classifyWorkOsUserFacingError(error, "sign-in");

    Sentry.withScope((scope) => {
      scope.setTag("auth.error_kind", classified.kind);
      scope.setTag("auth.flow", pendingVerification.flow);
      scope.setTag("auth.step", "email_verification_resend");
      Sentry.captureException(error);
    });

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível reenviar o código agora.",
      },
      { status: 500 },
    );
  }
}
