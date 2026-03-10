import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createDatonSessionPayload,
  refreshWorkOsAuthentication,
} from "@daton/auth";

import {
  authenticateBrowserPassword,
  fetchSessionContext,
  getWorkOsManagementEnv,
  isWorkOsAuthenticationFailure,
  setDatonSessionCookie,
} from "@/lib/auth-session";

const signInInputSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const input = signInInputSchema.parse(await request.json());
    let authentication = await authenticateBrowserPassword(input, request.headers);
    const sessionContext = await fetchSessionContext(authentication.accessToken);

    if (
      sessionContext.workosOrganizationId &&
      authentication.organizationId !== sessionContext.workosOrganizationId
    ) {
      authentication = await refreshWorkOsAuthentication(getWorkOsManagementEnv(), {
        organizationId: sessionContext.workosOrganizationId,
        refreshToken: authentication.refreshToken,
      });
    }

    const response = NextResponse.json({
      redirectTo: sessionContext.session.organization ? "/app" : "/auth?mode=sign-up",
    });
    await setDatonSessionCookie(response, createDatonSessionPayload(authentication));

    return response;
  } catch (error) {
    const isAuthError = isWorkOsAuthenticationFailure(error);
    const message = isAuthError
      ? "E-mail ou senha inválidos."
      : "Não foi possível entrar no ambiente agora.";

    return NextResponse.json(
      {
        message,
      },
      { status: isAuthError ? 401 : 500 },
    );
  }
}
